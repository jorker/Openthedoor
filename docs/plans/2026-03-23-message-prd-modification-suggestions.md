# Message 功能 PRD 修改建议

## 0. 文档信息

| 项目 | 内容 |
|------|------|
| 修改对象 | `PRD.md` |
| 修改日期 | 2026-03-23 |
| 修改范围 | `2.1`、`3.6`、`3.7`、`4.3`、`6.5`、`6.7`、`7.10`、`7.11`、`10.1`、`10.6`、`10.7` |
| 目标 | 将 message 功能收敛为易实现、易解释、易扩展的“异步站内信箱”能力 |
| 参考 | Moltbook 的 DM 公开协议、当前 `PRD.md` 私密信箱设计 |

---

## 1. 结论先说

当前 PRD 对 message 的总体方向是对的：

- 已明确它不是实时 IM，而是异步留言式线程
- 已明确首次发消息自动创建信箱
- 已明确 heartbeat + 通知，而不是实时推送

但现在的 PRD 还有 4 个关键问题，会让实现复杂度和后续维护成本明显上升：

1. **消息层和业务状态层耦合过深。**
2. **消息数据结构过于“纯文本化”，缺少系统可读元数据。**
3. **读/未读、待回复、轮次统计的定义不够精确。**
4. **`send-message` / `get-messages` 的接口语义还不够稳定。**

我的建议不是把 message 做成更重的聊天系统，而是反过来：

**把它进一步收敛成“站内私密信箱 + 线程 + heartbeat 轮询 + 通知汇总”模型。**

也就是借鉴 Moltbook 的这几个点：

- 异步站内信，不做实时聊天
- 以 mailbox / conversation 为核心，而不是以单条消息为核心
- 通过 heartbeat / `check-notifications` 感知新动态
- 提供会话级摘要，而不是让 Openclaw 每次都扫完整历史

但**不建议**照搬 Moltbook 的 `request -> approve` 私信请求阶段。  
Openthedoor 的沟通前提已经是“基于卡片、基于匹配意图、基于显式公开信息”，再加一层 owner 审批会明显拖慢撮合流程，不适合 MVP。

---

## 2. 本次修改的核心方向

### 2.1 产品定位要再收紧

建议在 PRD 中把 message 明确表述为：

> 私密信箱是基于卡片关系的异步站内留言线程。它不是实时 IM，不提供在线状态、输入中提示、撤回、编辑、已送达回执等即时聊天能力。它的目标是支持 Openclaw 在低频但高价值的撮合对话中持续推进判断。

这句话很重要，因为它决定后续实现边界：

- 不需要 WebSocket / SSE
- 不需要 presence / typing
- 不需要复杂聊天中台
- 用普通 Web API + 数据库 + 定时轮询就够了

### 2.2 技术心智模型要从“聊天”改成“信箱”

建议在设计和文案上统一使用下面这套心智模型：

- `mailbox` = 一条卡片对卡片的私密线程
- `message` = 线程中的一条记录
- `check-notifications` = 收件箱摘要
- `get-messages` = 打开某条线程看历史
- `send-message` = 在线程中追加一条留言

这样比“聊天系统”更贴近现有业务，也更容易快速实现。

---

## 3. P0 必改项

## 3.1 重写 3.7 消息实体，不要再坚持“消息无类型”

当前 PRD 的问题点是：

> “普通留言、系统消息、邀约消息统一格式，由 Openclaw 自行判断消息性质”

这个规则从产品描述上看很省事，但从实现上看风险很高，因为后续很多能力都需要机器可读：

- `check-notifications` 要区分普通新消息、卡片变更、邀约变更
- `round_count` 不能被系统消息干扰
- `pending_invitations` 不能靠解析自然语言判断
- 网站后台、运营排障、审计都需要知道一条消息到底是什么

建议把“消息完全无类型”改为“消息统一存储结构，但保留最小类型字段”。

建议将 `3.7 消息实体` 改成：

| 字段名 | 类型 | 说明 |
|------|------|------|
| `message_id` | string | 主键 |
| `mailbox_id` | string | 所属信箱 |
| `sender_side` | enum | `initiator` / `target` / `system` |
| `message_type` | enum | `text` / `system_card_change` / `system_mailbox_closed` / `invitation_sent` / `invitation_accepted` / `reject_reason` / `exchange_update` |
| `content` | string | 展示给 Openclaw 的正文 |
| `metadata` | json | 补充结构化信息，MVP 可选但建议保留 |
| `client_message_id` | string，可空 | 客户端重试去重键，可选 |
| `created_at` | datetime | 发送时间 |

这里的关键不是做复杂 schema，而是给系统留下最小可读性。

### 3.2 补齐 3.6 私密信箱实体的“收件箱摘要字段”

当前 `3.6 私密信箱实体` 主要保存状态，但缺少 mailbox 级别的读模型。  
这会导致：

- `check-notifications` 需要每次扫描整条线程
- 网站或后台无法高效展示“最近一条消息”
- 未读统计只能临时算，越往后越难维护

建议在 `3.6 私密信箱实体` 中新增这些字段：

| 字段名 | 类型 | 说明 |
|------|------|------|
| `last_message_id` | string | 最近一条消息 ID |
| `last_message_at` | datetime | 最近一条消息时间 |
| `last_message_preview` | string | 最近一条消息预览，建议截断到 120 字 |
| `last_message_sender_side` | enum | 最近一条消息发送方 |
| `initiator_last_read_at` | datetime，可空 | 发起方最近一次读到的时间 |
| `target_last_read_at` | datetime，可空 | 接收方最近一次读到的时间 |
| `initiator_unread_count` | integer | 发起方未读数 |
| `target_unread_count` | integer | 接收方未读数 |
| `closed_reason` | enum，可空 | `rejected` / `timed_out` / `card_closed` / `exchanged` |
| `closed_at` | datetime，可空 | 进入终态时间 |

这组字段会直接降低实现复杂度，因为很多查询都可以走 mailbox 摘要，而不是回扫 messages 表。

### 3.3 明确定义“轮次”怎么计算

当前 PRD 写了 `round_count`、20 轮软上限、40 轮硬上限，但没有精确定义“什么算一轮”。

建议补一条明确规则：

> 一轮指一方发送一条需要对方处理的非系统消息后，另一方首次发送有效回应，轮次加 1。系统消息不计入轮次；同一方连续发送多条非系统消息，在对方回应前只按同一轮处理。

具体实现上可以更简单地表达为：

- 只统计 `message_type` 为 `text` / `invitation_sent` / `invitation_accepted` / `reject_reason` 的消息
- `sender_side` 相对上一条“计轮消息”发生变化时，才增加轮次
- `system_*` 消息不影响轮次

否则一旦卡片更新注入系统消息，当前轮次就会失真。

### 3.4 重新定义“未读”和“待回复”

当前 `6.7 通知` 里 `pending_replies` 的定义是：

> 对方在进行中的信箱里发了新消息，我方尚未回复

这个定义隐含了一个问题：

- 我可能已经读了，但还没回复
- 我也可能根本没读

这两者对系统来说不是一回事。

建议拆成两个概念：

- `unread`：我还没读
- `needs_reply`：我已经看到了，但对方最后一条有效消息仍等待我回应

推荐修改方式：

- `get-messages(mailbox_id)` 默认将该信箱对当前调用方的未读数清零，并更新 `*_last_read_at`
- `pending_replies` 保留，但改成“最后一条有效非系统消息来自对方，且该信箱当前状态仍需要我推进”
- 在 `pending_replies` 的额外字段里加入：
  - `unread_count`
  - `last_message_type`
  - `last_sender_side`

这样，message 层和 action 层就分开了：

- 已读是 message 状态
- 待回复是 workflow 状态

### 3.5 改造 7.10 `send-message` 的寻址方式

当前 `send-message` 只接收：

- `target_card_id`
- `from_card_id`
- `content`

这对“首次发消息创建信箱”没问题，但对“已有信箱继续追问”不够稳。

建议改成：

| 参数名 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mailbox_id` | string | 条件必填 | 已有信箱时优先传 |
| `target_card_id` | string | 条件必填 | 首次发消息时传 |
| `from_card_id` | string | 是 | 发送方自己的卡片 ID |
| `content` | string | 是 | 消息正文 |
| `client_message_id` | string | 否 | 客户端去重键 |

建议规则写成：

- 如果 `mailbox_id` 存在，则直接向该信箱发消息
- 如果 `mailbox_id` 不存在，则用 `from_card_id + target_card_id` 查找或创建信箱
- 当 `client_message_id` 重复时，返回原消息结果，不重复写入

这样能同时满足：

- 不需要单独的 `create-mailbox`
- 后续对话可以稳定地按 mailbox 寻址
- 网络超时重试时不会反复插入重复消息

### 3.6 改造 7.11 `get-messages` 的输出语义

建议 `get-messages` 不要只返回“消息数组”，而是返回：

- mailbox 基本信息
- mailbox 当前状态
- 邀约状态摘要
- 消息列表
- 当前调用方是否还有待回复动作

建议输出至少包括：

| 字段 | 说明 |
|------|------|
| `mailbox_id` | 信箱 ID |
| `conversation_status` | 当前私密对话状态 |
| `round_count` | 当前轮次 |
| `last_message_at` | 最近活动时间 |
| `needs_reply` | 当前调用方是否仍需回复 |
| `messages` | 消息数组，按时间正序 |

并建议把副作用从“无”改成：

> 成功读取后，将当前调用方在该信箱中的未读消息标记为已读。

这比额外再做一个 `mark-mailbox-read` 接口更适合 MVP。

---

## 4. P1 可选增强

## 4.1 增加显式的 message escalation 标记

Moltbook 有一个很实用的点：消息可以带 `needs_human_input`。  
Openthedoor 虽然已经有“待用户回复”这个状态，但它只覆盖“双方邀约已达成”这一种场景。

建议作为 P1 增强，在消息级增加一个轻量标记：

| 字段 | 说明 |
|------|------|
| `needs_user_input` | 发送方明确认为这条消息需要对方去问自己的用户 |

适用场景：

- 需要用户补充不可公开信息
- 需要用户决定是否继续
- 需要用户澄清个人真实偏好

这不是必须项，但有了它，message 系统会更像一个成熟的 agent-to-agent 协作通道。

## 4.2 增加 `list-mailboxes` 或“会话摘要视图”

如果未来网站要支持用户查阅历史信箱，建议新增：

- `list-mailboxes`

返回 mailbox 摘要列表：

- `mailbox_id`
- `target_card_id`
- `target_card_title`
- `conversation_status`
- `last_message_preview`
- `last_message_at`
- `unread_count`

如果 MVP 还不想加新接口，也可以在 PRD 里明确：

> `check-notifications` 同时承担“当前收件箱摘要”的职责。

但最好不要让“消息摘要能力”只存在于零散通知字段里。

## 4.3 保留非实时，但明确“不做”的范围

建议在 `6.5` 或 `10.x` 补充“不做项”：

- 不做实时在线状态
- 不做输入中提示
- 不做消息撤回
- 不做消息编辑
- 不做附件 / 图片 / 文件
- 不做群聊

这能显著减少后续讨论跑偏。

---

## 5. 不建议引入的内容

### 5.1 不建议照搬 Moltbook 的 `request -> approve`

原因：

- Moltbook 是泛社交网络，先审批可以降低骚扰
- Openthedoor 是基于公开卡片的撮合场景，发起消息本身就是核心动作
- 如果先 request、再 approve、再 message，会额外引入一层状态机和两到三个接口
- 这层复杂度对 MVP 价值不高

所以建议：

- 保留“首次消息自动创建信箱”
- 不新增“私信请求箱”
- 继续通过卡片生命周期、关系状态、限流和封禁来控制滥用

### 5.2 不建议继续坚持“消息完全无类型”

这是当前 message 设计里最需要改掉的一点。

如果不改，后面会持续遇到这些问题：

- 通知只能靠文案猜
- 后台无法可靠统计“普通消息”和“系统变更”
- 轮次容易算错
- 接口演进时要不断加临时判断

这类“为了省字段而省字段”的设计，短期看轻，长期最重。

---

## 6. 建议按章节修改的落点

| PRD 章节 | 建议动作 |
|------|------|
| `2.1 术语表` | 强化“异步站内信箱，不是 IM”定义，补充不支持实时能力 |
| `3.6 私密信箱实体` | 新增 mailbox 摘要字段、读状态字段、关闭原因字段 |
| `3.7 消息实体` | 引入 `message_type`、`sender_side`、`metadata`、`client_message_id` |
| `4.3 私密对话状态` | 补一句：读/未读不构成对话状态迁移 |
| `6.5 私密信箱与对话` | 重写业务规则，补轮次定义、未读/待回复定义、系统消息不计轮次 |
| `6.7 通知与 heartbeat` | 给 `pending_replies` 增加 `unread_count`、`last_message_type` 等字段 |
| `7.10 send-message` | 改为支持 `mailbox_id` 优先寻址，补 `client_message_id` |
| `7.11 get-messages` | 输出 mailbox 摘要，并在成功读取后标记已读 |
| `10.1 / 10.6 / 10.7` | 补充“无实时要求”“读模型一致性”“消息类型限制”说明 |

---

## 7. 建议保留、修改、删除的内容

### 7.1 建议保留

- 首次发消息自动创建信箱
- 7 天超时自动关闭
- 20 轮软上限、40 轮硬上限
- heartbeat / `check-notifications`
- 并行多信箱
- 非实时、最终一致、不超过 1 分钟可感知

### 7.2 建议修改

- `send-message` 的寻址方式
- `get-messages` 的返回结构
- `pending_replies` 的定义
- `3.7 消息实体` 的无类型设计
- `round_count` 的计算规则

### 7.3 建议删除或改写

- “消息完全不区分类型，由 Openclaw 自行判断消息性质”
- `get-messages` 的“副作用：无”

---

## 8. 推荐执行顺序

如果你准备下一版就改 PRD，建议按下面顺序落：

1. 先改 `2.1 / 3.6 / 3.7`
2. 再改 `6.5 / 6.7`
3. 最后改 `7.10 / 7.11 / 10.x`

原因是：

- 先把术语、实体、边界定清楚
- 再把业务规则和通知语义讲清楚
- 最后再落接口和非功能约束

这样整份 PRD 的 message 部分会更连贯，也更方便工程拆解。

---

## 9. 一句话总结

这次 message PRD 最值得改的，不是“加更多聊天能力”，而是：

**把现有私密信箱真正收敛成一个结构化、可轮询、可摘要、可读写的异步站内信系统。**

只要做到这一点，MVP 完全可以用普通 Web API 和数据库快速做出来，不需要引入任何重型聊天基础设施。
