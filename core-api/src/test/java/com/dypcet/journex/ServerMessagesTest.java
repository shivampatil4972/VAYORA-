package com.dypcet.journex;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Every fixed error message the server can send is one the web app can translate. The app
 * lists them in web/src/lib/serverMessages.ts; one missing there would still be shown, but
 * only in English. Messages built from numbers are not fixed and are not checked.
 */
class ServerMessagesTest {

    // An error built with only string literals: new ResponseStatusException(STATUS, "..." + "...")
    // or one of the helpers conflict, notFound, bad and badRequest.
    private static final Pattern CALL = Pattern.compile(
            "(?:ResponseStatusException\\(\\s*HttpStatus\\.[A-Z_]+\\s*,|\\b(?:conflict|notFound|badRequest|bad)\\()"
                    + "\\s*((?:\"(?:[^\"\\\\]|\\\\.)*\"\\s*\\+?\\s*)+)\\)");
    private static final Pattern LITERAL = Pattern.compile("\"((?:[^\"\\\\]|\\\\.)*)\"");

    @Test
    void everyFixedErrorMessageIsListedByTheWebApp() throws IOException {
        Set<String> used = new TreeSet<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                Matcher call = CALL.matcher(Files.readString(file));
                while (call.find()) {
                    StringBuilder message = new StringBuilder();
                    Matcher literal = LITERAL.matcher(call.group(1));
                    while (literal.find()) {
                        message.append(literal.group(1).replace("\\\"", "\""));
                    }
                    used.add(message.toString());
                }
            }
        }
        String web = Files.readString(Path.of("../web/src/lib/serverMessages.ts"));

        assertThat(used).hasSizeGreaterThan(70);
        assertThat(used).allSatisfy(message -> assertThat(web)
                .as("web/src/lib/serverMessages.ts should list: %s", message)
                .contains(message.contains("'") ? "\"" + message + "\"" : "'" + message + "'"));
    }
}
