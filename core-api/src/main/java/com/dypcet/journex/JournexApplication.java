package com.dypcet.journex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JournexApplication {

    public static void main(String[] args) {
        SpringApplication.run(JournexApplication.class, args);
    }
}
