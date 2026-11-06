package com.yueju.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
public class BackendSpringApplication {

	public static void main(String[] args) {
		loadDotenv(Path.of("..", ".env"));
		loadDotenv(Path.of(".env"));
		SpringApplication.run(BackendSpringApplication.class, args);
	}

	private static void loadDotenv(Path path) {
		if (!Files.exists(path)) {
			return;
		}

		try {
			List<String> lines = Files.readAllLines(path);
			for (String line : lines) {
				String trimmed = line.trim();
				if (trimmed.isEmpty() || trimmed.startsWith("#")) {
					continue;
				}

				int separator = trimmed.indexOf('=');
				if (separator < 1) {
					continue;
				}

				String key = trimmed.substring(0, separator).trim();
				String value = trimmed.substring(separator + 1).trim();
				if ((value.startsWith("\"") && value.endsWith("\""))
						|| (value.startsWith("'") && value.endsWith("'"))) {
					value = value.substring(1, value.length() - 1);
				}

				if (System.getenv(key) == null && System.getProperty(key) == null) {
					System.setProperty(key, value);
				}
			}
		} catch (IOException ignored) {
			// Spring can still start from environment variables or application.properties defaults.
		}
	}
}
