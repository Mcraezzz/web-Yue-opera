package com.yueju.backend;

import com.yueju.backend.config.CorsConfig;
import com.yueju.backend.controller.ApiExceptionHandler;
import com.yueju.backend.controller.MediaAnalysisAdminController;
import com.yueju.backend.service.MediaAnalysisService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ApiBoundaryTests {
    private static final String KEY = "test-operator-key-with-at-least-32-characters";

    @RestController
    static class ProbeController {
        @PostMapping("/api/probe")
        Map<String, String> post(@RequestBody Map<String, String> body) { return body; }
        @DeleteMapping("/api/probe")
        void delete() { }
    }

    @Configuration
    @EnableWebMvc
    @Import({CorsConfig.class, ProbeController.class, ApiExceptionHandler.class})
    static class WebConfig { }

    @Test
    void invalidJsonIs400AndWrongMethodIs405() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new ProbeController())
                .setControllerAdvice(new ApiExceptionHandler()).build();
        mvc.perform(post("/api/probe").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
        mvc.perform(put("/api/probe"))
                .andExpect(status().isMethodNotAllowed()).andExpect(header().exists("Allow"));
    }

    @Test
    void corsAllowsConfiguredDeleteAndRejectsUnknownOrigins() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(WebConfig.class);
            context.refresh();
            var mvc = MockMvcBuilders.webAppContextSetup(context).build();
            mvc.perform(options("/api/probe").header("Origin", "http://localhost:5173")
                            .header("Access-Control-Request-Method", "DELETE")
                            .header("Access-Control-Request-Headers", "Authorization"))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
            mvc.perform(options("/api/probe").header("Origin", "https://untrusted.example")
                            .header("Access-Control-Request-Method", "DELETE"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void operatorEndpointIsAbsentUnlessExplicitlyEnabled() {
        new ApplicationContextRunner().withUserConfiguration(MediaAnalysisAdminController.class)
                .run(context -> assertEquals(0, context.getBeansOfType(MediaAnalysisAdminController.class).size()));
    }

    @Test
    void enabledOperatorEndpointRequiresKeyAndDoesNotRunUnauthorizedJobs() throws Exception {
        var service = mock(MediaAnalysisService.class);
        assertThrows(IllegalArgumentException.class, () -> new MediaAnalysisAdminController(service, ""));
        var mvc = MockMvcBuilders.standaloneSetup(new MediaAnalysisAdminController(service, KEY))
                .setControllerAdvice(new ApiExceptionHandler()).build();
        mvc.perform(post("/api/media-analyses/analyze-local").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
        mvc.perform(post("/api/media-analyses/analyze-local").header("X-Media-Operator-Key", KEY)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        verify(service).analyzeLocalMedia(any());
    }
}
