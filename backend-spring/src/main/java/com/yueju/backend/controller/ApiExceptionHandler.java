package com.yueju.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        String message = ex.getReason() == null ? "请求失败" : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        // Preserve Spring MVC's 4xx contract (bad JSON, validation, wrong method, etc.).
        if (ex instanceof ErrorResponse error) {
            return ResponseEntity.status(error.getStatusCode())
                    .headers(error.getHeaders())
                    .body(Map.of("error", "请求格式、参数或方法不正确"));
        }
        if (ex instanceof org.springframework.http.converter.HttpMessageNotReadableException) {
            return ResponseEntity.badRequest().body(Map.of("error", "请求 JSON 格式不正确"));
        }
        log.error("Unhandled API exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "服务器内部错误"));
    }
}
