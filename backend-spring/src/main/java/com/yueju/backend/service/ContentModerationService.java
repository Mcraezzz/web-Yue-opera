package com.yueju.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ContentModerationService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[\\p{IsHan}a-zA-Z0-9_-]{3,32}$");
    private static final Pattern HTML_PATTERN = Pattern.compile("<\\s*/?\\s*[a-zA-Z][^>]*>");
    private static final Pattern URL_PATTERN = Pattern.compile("(?i)(https?://|www\\.|\\.com\\b|\\.cn\\b|\\.net\\b)");
    private static final Pattern CONTROL_PATTERN = Pattern.compile("[\\p{Cntrl}&&[^\\r\\n\\t]]");

    private static final List<String> BLOCKED_WORDS = List.of(
            "傻逼", "操你", "妈的", "滚蛋", "去死", "诈骗", "博彩", "赌博", "黄色", "色情",
            "外挂", "刷单", "代刷", "加微信", "加qq", "fuck", "shit", "bitch"
    );

    private static final List<String> RESERVED_NAMES = List.of(
            "admin", "administrator", "root", "system", "official", "null", "undefined",
            "管理员", "系统", "官方", "客服", "站长", "越韵清音官方"
    );

    public String moderateUsername(String username) {
        String normalized = normalize(username);
        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            throw badRequest("用户名需为 3-32 位中文、字母、数字、下划线或短横线");
        }
        rejectReservedName(normalized, "用户名");
        rejectBlockedWords(normalized, "用户名");
        rejectHtml(normalized, "用户名");
        return normalized.toLowerCase(Locale.ROOT);
    }

    public String moderateNickname(String nickname) {
        String normalized = normalize(nickname);
        if (normalized.isEmpty() || normalized.length() > 24) {
            throw badRequest("昵称需为 1-24 个字符");
        }
        rejectReservedName(normalized, "昵称");
        rejectBlockedWords(normalized, "昵称");
        rejectHtml(normalized, "昵称");
        return normalized;
    }

    public String moderateComment(String content) {
        String normalized = normalize(content);
        if (normalized.isEmpty()) {
            throw badRequest("评论内容不能为空");
        }
        if (normalized.length() > 500) {
            throw badRequest("评论内容不能超过 500 个字符");
        }
        rejectBlockedWords(normalized, "评论");
        rejectHtml(normalized, "评论");
        if (URL_PATTERN.matcher(normalized).find()) {
            throw badRequest("评论中不能包含网址或推广链接");
        }
        return normalized;
    }

    private String normalize(String value) {
        if (value == null) return "";
        return CONTROL_PATTERN.matcher(value)
                .replaceAll("")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private void rejectReservedName(String value, String field) {
        String lower = value.toLowerCase(Locale.ROOT);
        for (String reservedName : RESERVED_NAMES) {
            if (lower.equals(reservedName.toLowerCase(Locale.ROOT))) {
                throw badRequest(field + "不能使用系统保留名称");
            }
        }
    }

    private void rejectBlockedWords(String value, String field) {
        String lower = value.toLowerCase(Locale.ROOT);
        for (String word : BLOCKED_WORDS) {
            if (lower.contains(word.toLowerCase(Locale.ROOT))) {
                throw badRequest(field + "包含不适合公开展示的内容，请修改后再提交");
            }
        }
    }

    private void rejectHtml(String value, String field) {
        if (HTML_PATTERN.matcher(value).find()) {
            throw badRequest(field + "不能包含 HTML 标签或脚本内容");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
