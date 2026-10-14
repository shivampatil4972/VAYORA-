package com.dypcet.journex.notification;

import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * In-app notifications, kept in MongoDB.
 *
 * <p>Sending never fails its caller: a notification is a courtesy, a booking is not. When
 * called inside a database transaction the notification is written only after that
 * transaction commits, so nobody is told about something that was rolled back.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final String COLLECTION = "notifications";
    private static final int LISTED = 50;

    /** The kinds of thing a member is told about. Stored with each notification. */
    public enum Type {
        BOOKING_REQUESTED,
        BOOKING_CONFIRMED,
        BOOKING_DECLINED,
        BOOKING_CANCELLED,
        RIDE_CANCELLED,
        TRIP_COMPLETED,
        MARKED_NO_SHOW,
        ACCOUNT_NOTICE,
        SOS_RAISED,
        REQUEST_EXPIRED,
        TRIP_DISPUTED,
        RATING_REMINDER
    }

    public record Notification(String id, Type type, String message, Long bookingId,
            Instant createdAt, boolean read) {
    }

    private final MongoTemplate mongo;
    private final Clock clock;

    public NotificationService(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    @PostConstruct
    void ensureIndex() {
        try {
            mongo.indexOps(COLLECTION).ensureIndex(
                    new Index().on("userId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC));
        } catch (RuntimeException e) {
            log.warn("Could not create the notifications index: {}", e.getMessage());
        }
    }

    public void send(long userId, Type type, String message, Long bookingId) {
        Document document = new Document("userId", userId)
                .append("type", type.name())
                .append("message", message)
                .append("bookingId", bookingId)
                .append("createdAt", Date.from(clock.instant()))
                .append("readAt", null);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    write(document);
                }
            });
        } else {
            write(document);
        }
    }

    private void write(Document document) {
        try {
            mongo.insert(document, COLLECTION);
        } catch (RuntimeException e) {
            log.warn("Notification not delivered to user {}: {}", document.get("userId"),
                    e.getMessage());
        }
    }

    /** The member's newest notifications. */
    public List<Notification> forUser(long userId) {
        Query query = new Query(Criteria.where("userId").is(userId))
                .with(Sort.by(Sort.Direction.DESC, "createdAt", "_id")).limit(LISTED);
        return mongo.find(query, Document.class, COLLECTION).stream()
                .map(NotificationService::toNotification).toList();
    }

    public long unreadCount(long userId) {
        return mongo.count(new Query(unreadOf(userId)), COLLECTION);
    }

    /** Returns false if the member has no such notification. */
    public boolean markRead(long userId, String id) {
        if (!ObjectId.isValid(id)) {
            return false;
        }
        Query one = new Query(Criteria.where("_id").is(new ObjectId(id)).and("userId").is(userId));
        Document found = mongo.findOne(one, Document.class, COLLECTION);
        if (found == null) {
            return false;
        }
        if (found.get("readAt") == null) {
            mongo.updateFirst(one, Update.update("readAt", Date.from(clock.instant())), COLLECTION);
        }
        return true;
    }

    public void markAllRead(long userId) {
        mongo.updateMulti(new Query(unreadOf(userId)),
                Update.update("readAt", Date.from(clock.instant())), COLLECTION);
    }

    private static Criteria unreadOf(long userId) {
        return Criteria.where("userId").is(userId).and("readAt").is(null);
    }

    private static Notification toNotification(Document document) {
        Number booking = (Number) document.get("bookingId");
        return new Notification(
                document.getObjectId("_id").toHexString(),
                Type.valueOf(document.getString("type")),
                document.getString("message"),
                booking == null ? null : booking.longValue(),
                document.getDate("createdAt").toInstant(),
                document.get("readAt") != null);
    }
}
