package com.yueju.backend.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DemoAccountSeeder demoAccountSeeder;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate, DemoAccountSeeder demoAccountSeeder) {
        this.jdbcTemplate = jdbcTemplate;
        this.demoAccountSeeder = demoAccountSeeder;
    }

    @Override
    public void run(ApplicationArguments args) {
        migrate();
        seed();
    }

    private void migrate() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS users (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  username VARCHAR(120) NOT NULL UNIQUE,
                  password_hash VARCHAR(255) NOT NULL,
                  nickname VARCHAR(120) NOT NULL,
                  bio VARCHAR(500) NOT NULL DEFAULT '',
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS auth_tokens (
                  token_hash CHAR(64) PRIMARY KEY,
                  user_id INT NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  last_used_at TIMESTAMP NULL,
                  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  INDEX idx_auth_tokens_user_expires (user_id, expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS plays (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  title VARCHAR(160) NOT NULL UNIQUE,
                  category VARCHAR(80) NOT NULL,
                  description TEXT NOT NULL,
                  image_key VARCHAR(80) NOT NULL,
                  like_count INT NOT NULL DEFAULT 0,
                  collection_count INT NOT NULL DEFAULT 0,
                  sort_order INT NOT NULL DEFAULT 0,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS news (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  title VARCHAR(220) NOT NULL UNIQUE,
                  category VARCHAR(80) NOT NULL,
                  summary TEXT NOT NULL,
                  published_date DATE NOT NULL,
                  source_url VARCHAR(500) NOT NULL DEFAULT '',
                  sort_order INT NOT NULL DEFAULT 0,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS search_items (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  title VARCHAR(160) NOT NULL UNIQUE,
                  category VARCHAR(80) NOT NULL,
                  description TEXT NOT NULL,
                  sort_order INT NOT NULL DEFAULT 0,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS play_likes (
                  user_id INT NOT NULL,
                  play_id INT NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (user_id, play_id),
                  CONSTRAINT fk_play_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_play_likes_play FOREIGN KEY (play_id) REFERENCES plays(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS play_collections (
                  user_id INT NOT NULL,
                  play_id INT NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (user_id, play_id),
                  CONSTRAINT fk_play_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_play_collections_play FOREIGN KEY (play_id) REFERENCES plays(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS today_playlist_collections (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  recommendation_key VARCHAR(160) NOT NULL,
                  play_title VARCHAR(160) NOT NULL,
                  display_title VARCHAR(220) NOT NULL,
                  performer VARCHAR(220) NOT NULL,
                  lyric VARCHAR(700) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE KEY uk_today_playlist_user_key (user_id, recommendation_key),
                  INDEX idx_today_playlist_user_created (user_id, created_at),
                  CONSTRAINT fk_today_playlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS play_comments (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  play_id INT NOT NULL,
                  content VARCHAR(1000) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_play_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_play_comments_play FOREIGN KEY (play_id) REFERENCES plays(id) ON DELETE CASCADE,
                  INDEX idx_play_comments_play_created (play_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS play_shares (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  play_id INT NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_play_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  CONSTRAINT fk_play_shares_play FOREIGN KEY (play_id) REFERENCES plays(id) ON DELETE CASCADE,
                  INDEX idx_play_shares_play_created (play_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS ai_chat_messages (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  role VARCHAR(20) NOT NULL,
                  content TEXT NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_ai_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  INDEX idx_ai_chat_messages_user_created (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS ai_image_generations (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  prompt TEXT NOT NULL,
                  final_prompt TEXT NOT NULL,
                  image_url VARCHAR(1200) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_ai_image_generations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  INDEX idx_ai_image_generations_user_created (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS browsing_history (
                  id INT PRIMARY KEY AUTO_INCREMENT,
                  user_id INT NOT NULL,
                  title VARCHAR(220) NOT NULL,
                  description VARCHAR(1000) NOT NULL DEFAULT '',
                  path VARCHAR(500) NOT NULL DEFAULT '',
                  view_count INT NOT NULL DEFAULT 1,
                  last_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  CONSTRAINT fk_browsing_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                  UNIQUE KEY uk_browsing_history_user_title_path (user_id, title, path),
                  INDEX idx_browsing_history_user_viewed (user_id, last_viewed_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """);
    }

    private void seed() {
        demoAccountSeeder.seed();

        Object[][] plays = {
                {"梁山伯与祝英台", "爱情悲剧", "越剧最具代表性的经典剧目，讲述梁山伯与祝英台的凄美爱情故事。1953 年被拍摄成中国第一部彩色戏曲电影。", "play-1", 128, 56, 1},
                {"红楼梦", "文学名著改编", "根据曹雪芹同名小说改编，以贾宝玉和林黛玉的爱情悲剧为主线，是越剧舞台上的代表作。", "play-2", 156, 82, 2},
                {"西厢记", "古典爱情", "取材于元代王实甫同名杂剧，讲述张生与崔莺莺的爱情故事，是越剧传统经典保留剧目。", "play-3", 112, 49, 3},
                {"祥林嫂", "现代题材", "改编自鲁迅小说《祝福》，以细腻唱腔塑造人物命运，是越剧改革进程中的重要作品。", "play-4", 97, 38, 4},
                {"碧玉簪", "传统剧目", "讲述李秀英含冤受辱却终获清白的故事，情节曲折，唱腔优美，是越剧传统剧目。", "play-5", 89, 35, 5},
                {"追鱼", "神话传说", "取材于民间传说，讲述鲤鱼精与书生张珍之间的爱情故事，舞台风格浪漫灵动。", "play-6", 101, 44, 6},
        };
        for (Object[] play : plays) {
            jdbcTemplate.update("""
                    INSERT IGNORE INTO plays
                      (title, category, description, image_key, like_count, collection_count, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, play);
        }

        Object[][] news = {
                {"青春越剧《九斤姑娘》开排", "排演动态", "杭州网报道，浙江小百花越剧院青春越剧《九斤姑娘》建组会暨开排仪式在杭州举行，这部承载越剧经典文脉的作品正式进入排演阶段。", "2026-04-19", "https://news.hangzhou.com.cn/zjnews/content/2026-04/19/content_9208631.htm", 1},
                {"下一个120年，越剧的想象空间有多大", "文艺评论", "潮新闻组织圆桌对话，围绕越剧120岁之后如何续写新篇、如何面对新趋势与新问题展开讨论。", "2026-04-03", "https://cs.zjol.com.cn/202604/t20260403_31588027.shtml", 2},
                {"百年越剧正青春 五代“小百花”同台献艺", "演出资讯", "杭州网报道，“致越剧·正青春”浙江小百花越剧院致敬越剧诞生120周年主题晚会在蝴蝶剧场上演，五代“小百花”同台献艺。", "2026-03-30", "https://hznews.hangzhou.com.cn/wenti/content/2026-03/30/content_9198683.htm", 3},
                {"越剧薪火相传120年", "文化传承", "人民网刊发人民日报报道，聚焦越剧诞生120年及“传百廿越韵 承时代新声”座谈会，展现越剧在新时代的传承与创新。", "2026-03-31", "https://cpc.people.com.cn/n1/2026/0331/c64387-40692191.html", 4},
                {"百年越剧艺术实现青春“突围”", "青年传播", "中国旅游报报道环境式越剧《新龙门客栈》的持续热潮，分析其如何以年轻化表达拓宽越剧传播边界。", "2026-03-18", "https://www.ctnews.com.cn/wenhua/content/2026-03/18/content_185124.html", 5},
                {"在跨界中拓展戏曲美学", "演出评论", "央视网从“春晚精彩回放”角度评论《越韵中国年——2026越剧春节晚会》，关注其跨界表达与戏曲美学创新。", "2026-02-25", "https://news.cctv.com/2026/02/25/ARTIELjBJ3uO2kzi0kRQu2k6260225.shtml", 6},
        };
        for (Object[] item : news) {
            int updated = jdbcTemplate.update("""
                    UPDATE news
                    SET title = ?, category = ?, summary = ?, published_date = ?, source_url = ?
                    WHERE sort_order = ?
                    """, item);
            if (updated == 0) {
                jdbcTemplate.update("""
                        INSERT INTO news (title, category, summary, published_date, source_url, sort_order)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          category = VALUES(category),
                          summary = VALUES(summary),
                          published_date = VALUES(published_date),
                          source_url = VALUES(source_url),
                          sort_order = VALUES(sort_order)
                        """, item);
            }
        }

        Object[][] searchItems = {
                {"袁派", "流派", "袁雪芬创立，唱腔质朴醇厚，委婉传统，是越剧旦角的重要流派。", 1},
                {"尹派", "流派", "尹桂芳创立，唱腔深沉隽永，流畅舒展，是越剧小生代表流派。", 2},
                {"范派", "流派", "范瑞娟创立，唱腔淳厚稳健，善于塑造忠厚儒雅的小生形象。", 3},
                {"傅派", "流派", "傅全香创立，唱腔华丽明亮，感情饱满，擅长塑造热烈真挚的旦角人物。", 4},
                {"徐派", "流派", "徐玉兰创立，音区宽广，行腔奔放洒脱，常用于表现才情、激情和书卷气兼具的小生形象。", 5},
                {"王派", "流派", "王文娟创立，唱腔含蓄细腻、韵味清雅，善于表现林黛玉式的内心层次。", 6},
                {"吕派", "流派", "吕瑞英创立，唱腔明快俏丽，表演灵动，适合表现聪慧活泼而情感充沛的旦角。", 7},
                {"金派", "流派", "金采风创立，唱腔甜润圆熟，重视人物性格与唱词情感的自然贴合。", 8},
                {"张派", "流派", "张云霞创立，唱腔委婉流畅，注重咬字、韵味和人物情绪的层层推进。", 9},
                {"戚派", "流派", "戚雅仙创立，唱腔沉稳苍劲，情感深切，常以厚重的表达表现人物命运。", 10},
                {"袁雪芬", "演员", "越剧改革先驱，袁派创始人，对现代越剧舞台体系、剧目建设和表演审美影响深远。", 11},
                {"尹桂芳", "演员", "尹派创始人，越剧小生表演艺术家，以儒雅潇洒、深情含蓄的舞台气质著称。", 12},
                {"范瑞娟", "演员", "范派创始人，越剧小生表演艺术家，唱腔醇厚稳健，塑造过许多忠厚儒雅的人物。", 13},
                {"傅全香", "演员", "傅派创始人，越剧旦角表演艺术家，以明亮华彩的唱腔和浓烈情感表达见长。", 14},
                {"徐玉兰", "演员", "徐派创始人，越剧小生表演艺术家，《红楼梦》中贾宝玉的经典扮演者。", 15},
                {"王文娟", "演员", "王派创始人，越剧旦角表演艺术家，《红楼梦》中林黛玉的经典扮演者。", 16},
                {"吕瑞英", "演员", "吕派创始人，越剧旦角表演艺术家，表演明丽灵动，唱腔甜润活泼。", 17},
                {"茅威涛", "演员", "当代越剧代表性艺术家，工小生，推动越剧在现代剧场、青年传播和跨界表达中的创新。", 18},
                {"赵志刚", "演员", "越剧男小生代表人物之一，长期探索男演员越剧表演和现代越剧传播。", 19},
                {"钱惠丽", "演员", "当代越剧徐派代表演员之一，擅长小生角色，舞台气质俊逸清朗。", 20},
                {"单仰萍", "演员", "当代越剧王派代表演员之一，表演细腻端庄，擅长塑造古典女性人物。", 21},
                {"何赛飞", "演员", "越剧演员出身，后活跃于影视领域，是越剧艺术跨媒介传播的代表人物之一。", 22},
                {"方亚芬", "演员", "当代越剧袁派代表演员之一，嗓音醇厚，舞台表达含蓄深情。", 23},
                {"越剧的诞生", "历史", "1906 年，越剧起源于浙江嵊县的落地唱书，由民间说唱艺术发展而来。", 24},
                {"落地唱书", "历史", "落地唱书是越剧早期源头之一，原本以说唱形式在乡村流行，后来逐渐吸收戏曲表演因素。", 25},
                {"女子越剧的兴起", "历史", "20 世纪 20 至 30 年代，女子越剧科班出现，女子越剧逐渐成为主流。", 26},
                {"越剧进入上海", "历史", "越剧进入上海后吸收都市剧场、灯光布景、编导演制度等因素，艺术形态逐渐成熟。", 27},
                {"新越剧改革", "历史", "20 世纪 40 年代起，越剧在剧本、导演、舞美、音乐和表演制度上推进改革，形成更完整的现代舞台体系。", 28},
                {"越剧电影", "历史", "越剧电影让舞台经典借助银幕传播，《梁山伯与祝英台》《红楼梦》等作品扩大了越剧影响。", 29},
                {"浙江小百花", "历史", "浙江小百花越剧团以青春化、学院化和剧场化探索闻名，是当代越剧传播的重要力量。", 30},
                {"越剧诞生120年", "历史", "2026 年是越剧诞生 120 年，相关纪念演出与讨论集中呈现了越剧传承和创新的新议题。", 31},
                {"梁祝经典片段", "视频", "1953 年彩色戏曲电影《梁山伯与祝英台》的经典片段。", 32},
                {"天上掉下个林妹妹", "视频", "越剧《红楼梦》中流传广泛的经典唱段，常用于展示宝黛初见的诗意与人物气质。", 33},
                {"十八相送", "视频", "《梁山伯与祝英台》经典段落，通过送别路上的唱念和身段表现含蓄情意。", 34},
                {"楼台会", "视频", "《梁山伯与祝英台》重要情节，情感由重逢、惊痛走向悲剧高潮，是唱做并重的段落。", 35},
                {"何文秀", "剧目", "越剧传统剧目，常以书生何文秀的遭遇展开情节，适合展示小生唱腔与剧情反转。", 36},
                {"五女拜寿", "剧目", "越剧经典剧目，以家庭伦理和人情冷暖见长，人物众多，适合展示群戏调度。", 37},
                {"玉堂春", "剧目", "越剧常演剧目之一，取材传统公案爱情故事，唱做并重，人物情感曲折。", 38},
                {"孔雀东南飞", "剧目", "根据汉乐府叙事诗改编，表现焦仲卿与刘兰芝的爱情悲剧，具有浓厚文学气质。", 39},
                {"陆游与唐琬", "剧目", "现代越剧代表剧目之一，围绕陆游、唐琬情感悲剧展开，诗词意象与唱腔抒情结合紧密。", 40},
                {"孟丽君", "剧目", "越剧经典题材之一，兼具才女传奇、身份转换和机智叙事，适合展示旦角表演层次。", 41},
                {"九斤姑娘", "剧目", "越剧经典喜剧题材，人物鲜活，生活气息浓，常用于展现越剧轻喜剧表达。", 42},
                {"新龙门客栈", "剧目", "环境式越剧代表作品之一，以沉浸式空间和年轻化传播方式推动越剧破圈。", 43},
                {"尺调腔", "唱腔", "尺调腔是越剧重要腔调之一，旋律流畅，抒情性强，常用于表达细腻柔婉的情绪。", 44},
                {"弦下调", "唱腔", "弦下调音色深沉，适合表现哀婉、沉郁或命运感较强的情境。", 45},
                {"四工调", "唱腔", "四工调明朗流畅，常用于叙事推进和较轻快的情绪表达。", 46},
                {"越剧男调", "唱腔", "越剧男调在男小生和男性角色塑造中使用，强调声腔线条与人物气质的结合。", 47},
                {"清板", "唱腔", "清板常以较自由的节奏突出唱词和人物内心，适合抒发细腻情感。", 48},
                {"慢板", "唱腔", "慢板节奏舒展，便于铺陈人物心理和情绪变化，是越剧抒情风格的重要载体。", 49},
                {"小生行当", "唱腔", "越剧小生重视清朗气质、书卷感和含蓄身段，尹派、范派、徐派各有代表风格。", 50},
                {"旦角行当", "唱腔", "越剧旦角强调细腻情感、婉转唱腔和柔美身段，袁派、傅派、王派、吕派等各具韵味。", 51},
                {"水袖", "舞台", "水袖是戏曲身段的重要媒介，在越剧中常用于表现人物情绪的流动、转折和含蓄表达。", 52},
                {"圆场", "舞台", "圆场通过连续步法表现行进、转换空间或情绪推进，是传统戏曲程式的重要组成。", 53},
                {"江南意象", "舞台", "越剧舞台常借桥、水、月门、园林、烟雨等江南意象营造清雅柔和的审美氛围。", 54},
                {"舞台灯光", "舞台", "现代越剧通过灯光层次、色温和空间切分强化情绪，引导观众进入人物内心。", 55},
                {"环境式越剧", "舞台", "环境式越剧打破镜框式舞台边界，让观众在更近距离和多空间动线中参与叙事。", 56},
                {"戏曲程式", "舞台", "戏曲程式把生活动作提炼为唱念做打和身段语汇，越剧以含蓄、圆润、抒情见长。", 57},
                {"越剧头面", "服饰", "头面是越剧人物造型的重要组成，珠翠、水钻、发髻和簪饰共同提示身份、年龄与审美气质。", 58},
                {"越剧戏服", "服饰", "越剧戏服常以柔和配色、纹样和水袖线条服务人物性格，兼具传统程式与现代舞美设计。", 59},
                {"云肩", "服饰", "云肩常用于女性角色服饰造型，既丰富肩颈轮廓，也增强舞台视觉层次。", 60},
                {"折扇", "服饰", "折扇在小生表演中既是道具也是身段延伸，可表现书卷气、情绪遮掩和节奏变化。", 61},
                {"越剧妆容", "服饰", "越剧妆容较重视清秀、柔和与舞台可视性，通过眉眼、腮红和唇色塑造人物气质。", 62},
                {"服饰纹样", "服饰", "越剧服饰纹样常结合花卉、云纹、团花等传统元素，服务角色身份和舞台色彩关系。", 63},
                {"智能字幕", "视频", "音视频智能化可通过 ASR 生成唱词字幕和时间轴，让用户按片段理解唱词、剧情节点与人物情绪。", 64},
                {"唱腔情绪曲线", "唱腔", "唱腔情绪曲线可根据音频能量、节奏密度、拖腔长度和语义转折，辅助展示唱段情绪变化。", 65},
                {"画面语义识别", "视频", "画面语义识别可提取演员身段、服饰头面、道具、布景和灯光元素，帮助用户理解舞台美学。", 66},
                {"唱段时间轴", "视频", "唱段时间轴将视频或音频拆分为入场、起唱、情绪推进、收束等节点，适合与 AI 问戏联动讲解。", 67},
        };
        for (Object[] item : searchItems) {
            jdbcTemplate.update("""
                    INSERT INTO search_items (title, category, description, sort_order) VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                      category = VALUES(category),
                      description = VALUES(description),
                      sort_order = VALUES(sort_order)
                    """, item);
        }
    }
}
