package com.dypcet.journex.account;

/** Sends an email or a text message to someone outside the platform. */
public interface MessageSender {

    enum Channel {
        EMAIL,
        PHONE
    }

    /** Recorded wherever a message matters, so a record says whether it really went. */
    String name();

    void send(Channel channel, String to, String text);
}
