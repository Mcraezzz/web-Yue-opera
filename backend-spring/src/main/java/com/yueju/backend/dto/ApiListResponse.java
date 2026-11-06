package com.yueju.backend.dto;

import java.util.List;

public record ApiListResponse<T>(List<T> items) {
}
