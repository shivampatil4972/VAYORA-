package com.dypcet.journex.receipt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dypcet.journex.PostgresIntegrationTest;
import com.dypcet.journex.booking.BookingService;
import com.dypcet.journex.identity.IdentityService;
import com.dypcet.journex.identity.TokenService;
import com.dypcet.journex.identity.UserRole;
import com.dypcet.journex.pass.PassProperties.Kind;
import com.dypcet.journex.pass.PassService;
import com.dypcet.journex.payment.PaymentChoice;
import com.dypcet.journex.ride.RideService;
import com.dypcet.journex.ride.RideService.PublishRide;
import com.dypcet.journex.ride.RideService.StopInput;
import com.dypcet.journex.vehicle.VehicleService;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@AutoConfigureMockMvc
class ReceiptIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private IdentityService identity;

    @Autowired
    private VehicleService vehicles;

    @Autowired
    private RideService rides;

    @Autowired
    private BookingService bookings;

    @Autowired
    private PassService passes;

    @Autowired
    private ReceiptService receipts;

    @Autowired
    private TokenService tokens;

    @Autowired
    private MockMvc mvc;

    private long driver;
    private long passenger;
    private long rideId;

    @BeforeEach
    void setUp() {
        driver = user(UserRole.DRIVER, "Ravi Jadhav");
        passenger = user(UserRole.PASSENGER, "Asha Patil");
        long vehicleId = vehicles.create(driver, "Maruti", "Ertiga", 2022, "Silver", 7).id();
        rideId = rides.publish(driver, new PublishRide(vehicleId, Instant.now().plus(Duration.ofDays(3)), 3, true,
                List.of(new StopInput("Kolhapur", 16.7050, 74.2433, 0),
                        new StopInput("Pune", 18.5204, 73.8567, 270)),
                List.of(new BigDecimal("450.00")))).id();
    }

    @Test
    void aBookingReceiptSaysWhatWasPaidAndThatNoMoneyMoved() throws IOException {
        long bookingId = bookings.request(passenger, rideId, 0, 1, 2, PaymentChoice.card(), null).id();

        String text = text(receipts.forBooking(passenger, bookingId));

        assertThat(text).contains("Receipt for booking " + bookingId)
                .contains("Passenger: Asha Patil").contains("Driver: Ravi Jadhav")
                .contains("Trip: Kolhapur to Pune, 2 seats")
                .contains("Fare: Rs 900.00").contains("Service fee: Rs 90.00").contains("Total: Rs 990.00")
                .contains("by CARD").contains("Payment provider: MOCK")
                .contains("SIMULATED PAYMENT: no money was taken or paid")
                .contains("This is not a tax invoice")
                .doesNotContain("Refunded");
    }

    @Test
    void aReceiptAfterACancellationShowsWhatCameBack() throws IOException {
        long bookingId = bookings.request(passenger, rideId, 0, 1, 1, PaymentChoice.card(), null).id();
        bookings.cancel(passenger, bookingId);

        // Three days ahead: the whole fare comes back, the fee does not.
        assertThat(text(receipts.forBooking(passenger, bookingId)))
                .contains("Booking status: CANCELLED").contains("Refunded: Rs 450.00 (passenger cancelled)");
    }

    @Test
    void aPassReceiptSaysWhatThePassCovers() throws IOException {
        long passId = passes.buy(passenger, Kind.MONTHLY, PaymentChoice.card()).id();

        assertThat(text(receipts.forPass(passenger, passId)))
                .contains("Receipt for travel pass " + passId).contains("Pass: monthly")
                .contains("Total: Rs 299.00").contains("No service fee is charged")
                .contains("SIMULATED PAYMENT");
    }

    @Test
    void nobodyGetsAnotherPersonsReceipt() {
        long bookingId = bookings.request(passenger, rideId, 0, 1, 1, PaymentChoice.card(), null).id();
        long passId = passes.buy(passenger, Kind.WEEKLY, PaymentChoice.card()).id();
        long stranger = user(UserRole.PASSENGER, "Stranger");

        for (Runnable attempt : List.<Runnable>of(() -> receipts.forBooking(stranger, bookingId),
                () -> receipts.forPass(stranger, passId), () -> receipts.forBooking(passenger, Long.MAX_VALUE))) {
            assertThatThrownBy(attempt::run).isInstanceOfSatisfying(ResponseStatusException.class,
                    e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        }
    }

    @Test
    void textTheFontsCannotDrawIsReplacedNotDropped() {
        assertThat(ReceiptService.latin("आशा Patil ₹")).isEqualTo("??? Patil ?");
    }

    @Test
    void theEndpointsServeAPdfToItsOwnerOnly() throws Exception {
        long bookingId = bookings.request(passenger, rideId, 0, 1, 1, PaymentChoice.card(), null).id();
        String owner = "Bearer " + tokens.issue(passenger, UserRole.PASSENGER);

        byte[] body = mvc.perform(get("/api/v1/bookings/" + bookingId + "/receipt").header("Authorization", owner))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"journex-booking-" + bookingId + ".pdf\""))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(body, 0, 5)).isEqualTo("%PDF-");

        mvc.perform(get("/api/v1/bookings/" + bookingId + "/receipt")
                        .header("Authorization", "Bearer " + tokens.issue(driver, UserRole.DRIVER)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/bookings/" + bookingId + "/receipt")).andExpect(status().isUnauthorized());
    }

    private static String text(byte[] pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }

    private long user(UserRole role, String name) {
        return identity.register(UUID.randomUUID() + "@example.test", "correct-horse-battery", name, role).id();
    }
}
