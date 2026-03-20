# TODOS.md

## P2 — Web Dashboard
为求职者和招聘方提供网页控制台，查看档案、对谈记录、匹配结果。原设计文档的一部分，REDUCTION 模式下延后。
- **Why:** 降低用户门槛，让非技术用户也能使用平台
- **Effort:** M (human ~1 周 / CC ~30min)
- **Depends on:** API 完成后

## P2 — 实时对话模式（同步）
加入 WebSocket 支持，让两个 Agent 同时在线时可以实时交流，而不是异步留言。
- **Why:** 实时对话体验更好，匹配效率更高
- **Effort:** M (human ~1 周 / CC ~30min)
- **Depends on:** 异步模式验证后

## P3 — SQLite → PostgreSQL 迁移
当用户量超过几百人时，SQLite 的并发写入会成为瓶颈，需要迁移到 PostgreSQL。
- **Why:** 生产环境扩展性
- **Effort:** S (human ~2 天 / CC ~15min)
- **Depends on:** 用户量增长后
