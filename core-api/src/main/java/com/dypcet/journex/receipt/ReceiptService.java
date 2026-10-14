package com.dypcet.journex.receipt;

import com.dypcet.journex.payment.MockPaymentProvider;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Receipts as PDF, for a booking's payment or a pass.
 *
 * <p>A receipt states what the records say, and nothing else. While the provider is the
 * mock, every receipt says plainly that no money moved. None is a tax invoice: the
 * platform does not handle GST.
 *
 * <p>The built-in PDF fonts cover Latin script only, so the receipt is in English and any
 * other character in a name or stop is shown as "?".
 */
@Service
public class ReceiptService {

    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter WHEN =
            DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm 'IST'", Locale.ENGLISH).withZone(CORRIDOR_ZONE);

    private final JdbcTemplate jdbc;

    public ReceiptService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** The receipt for the payment on one of the passenger's bookings. */
    public byte[] forBooking(long passengerId, long bookingId) {
        List<List<String>> found = jdbc.query("""
                SELECT b.id, u.full_name AS passenger, d.full_name AS driver,
                       s.name AS from_stop, t.name AS to_stop, b.seats, b.status,
                       r.departure_time + make_interval(mins => s.offset_minutes) AS boarding,
                       p.fare, p.service_fee, p.amount, p.method, p.provider, p.created_at,
                       COALESCE(f.amount, 0) AS refunded, f.reason AS refund_reason
                FROM bookings b
                JOIN payment_intents p ON p.booking_id = b.id
                JOIN users u ON u.id = b.passenger_id
                JOIN rides r ON r.id = b.ride_id
                JOIN users d ON d.id = r.driver_id
                JOIN ride_stops s ON s.ride_id = b.ride_id AND s.seq = b.from_seq
                JOIN ride_stops t ON t.ride_id = b.ride_id AND t.seq = b.to_seq
                LEFT JOIN refunds f ON f.booking_id = b.id
                WHERE b.id = ? AND b.passenger_id = ?""",
                (rs, n) -> {
                    List<String> lines = new ArrayList<>(List.of(
                            "Receipt for booking " + rs.getLong("id"),
                            "",
                            "Passenger: " + rs.getString("passenger"),
                            "Driver: " + rs.getString("driver"),
                            "Trip: " + rs.getString("from_stop") + " to " + rs.getString("to_stop")
                                    + ", " + rs.getInt("seats") + (rs.getInt("seats") == 1 ? " seat" : " seats"),
                            "Boarding: " + when(rs.getObject("boarding", OffsetDateTime.class)),
                            "Booking status: " + rs.getString("status"),
                            "",
                            "Paid: " + when(rs.getObject("created_at", OffsetDateTime.class))
                                    + " by " + rs.getString("method"),
                            "Fare: " + rupees(rs.getBigDecimal("fare")),
                            "Service fee: " + rupees(rs.getBigDecimal("service_fee")),
                            "Total: " + rupees(rs.getBigDecimal("amount"))));
                    if (rs.getBigDecimal("refunded").signum() > 0) {
                        lines.add("Refunded: " + rupees(rs.getBigDecimal("refunded"))
                                + " (" + rs.getString("refund_reason").toLowerCase(Locale.ROOT).replace('_', ' ') + ")");
                    }
                    lines.addAll(footer(rs.getString("provider")));
                    return lines;
                },
                bookingId, passengerId);
        // A booking with no payment, or someone else's, looks the same as none at all.
        return pdf(found.stream().findFirst().orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No receipt for that booking")));
    }

    /** The receipt for one of the passenger's passes. */
    public byte[] forPass(long passengerId, long passId) {
        List<List<String>> found = jdbc.query("""
                SELECT p.id, u.full_name AS passenger, p.kind, p.price, p.starts_at, p.ends_at,
                       p.method, p.provider, p.created_at
                FROM passes p JOIN users u ON u.id = p.passenger_id
                WHERE p.id = ? AND p.passenger_id = ?""",
                (rs, n) -> {
                    List<String> lines = new ArrayList<>(List.of(
                            "Receipt for travel pass " + rs.getLong("id"),
                            "",
                            "Passenger: " + rs.getString("passenger"),
                            "Pass: " + rs.getString("kind").toLowerCase(Locale.ROOT),
                            "Runs from " + when(rs.getObject("starts_at", OffsetDateTime.class))
                                    + " to " + when(rs.getObject("ends_at", OffsetDateTime.class)),
                            "No service fee is charged on bookings requested while it runs.",
                            "",
                            "Paid: " + when(rs.getObject("created_at", OffsetDateTime.class))
                                    + " by " + rs.getString("method"),
                            "Total: " + rupees(rs.getBigDecimal("price"))));
                    lines.addAll(footer(rs.getString("provider")));
                    return lines;
                },
                passId, passengerId);
        return pdf(found.stream().findFirst().orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No receipt for that pass")));
    }

    private static List<String> footer(String provider) {
        List<String> lines = new ArrayList<>(List.of("", "Payment provider: " + provider));
        if (MockPaymentProvider.NAME.equals(provider)) {
            lines.add("SIMULATED PAYMENT: no money was taken or paid. This is a student project.");
        }
        lines.add("This is not a tax invoice.");
        lines.add("JOURNEX, Kolhapur to Pune");
        return lines;
    }

    private static byte[] pdf(List<String> lines) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            try (PDPageContentStream text = new PDPageContentStream(document, page)) {
                text.beginText();
                text.newLineAtOffset(56, PDRectangle.A4.getHeight() - 72);
                text.setLeading(18);
                for (int i = 0; i < lines.size(); i++) {
                    text.setFont(i == 0 ? bold : regular, i == 0 ? 16 : 11);
                    text.showText(latin(lines.get(i)));
                    text.newLine();
                }
                text.endText();
            }
            document.getDocumentInformation().setTitle(latin(lines.get(0)));
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** What the built-in fonts can draw: printable ASCII. Anything else becomes "?". */
    static String latin(String text) {
        StringBuilder out = new StringBuilder(text.length());
        text.codePoints().forEach(c -> out.append(c >= 0x20 && c < 0x7F ? (char) c : '?'));
        return out.toString();
    }

    private static String rupees(BigDecimal amount) {
        return "Rs " + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static String when(OffsetDateTime time) {
        return WHEN.format(time.toInstant());
    }
}
