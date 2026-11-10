package com.yueju.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.yueju.backend.service.DatabaseInitializer;

@SpringBootTest
class BackendSpringApplicationTests {

    // Boot smoke tests must not mutate the developer's MySQL database.
    @MockitoBean
    DatabaseInitializer databaseInitializer;

	@Test
	void contextLoads() {
	}

}
