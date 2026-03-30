# UNS Namespace JSON 设计指南（Import / Tier0 风格）

本文说明如何编写供 **UNS 平台 import** 的 `namespace` JSON（如 TEP_Plant 树），使 **Schema 有数据、与 Node-RED MQTT payload 一致**，并便于与其他 LLM 或同事对齐约定。

> **范围**：本文针对「平台 import 的 namespace 定义 + Node-RED 仿真/设备 payload」的**对齐问题**。  
> 本仓库 **Henkel WMS** 前端使用的 topic 与信封约定见 [`MQTT_CONTRACT.md`](./MQTT_CONTRACT.md)；若 TEP 与 Henkel 共用同一平台，仍按**各命名空间自己的 topic 字符串**分别校验。

---

## Tier0 UNS import 规范（`TEP_Plant_UNS_namespace.json`）

[`TEP_Plant_UNS_namespace.json`](./TEP_Plant_UNS_namespace.json) 已按 **Tier0「UNS Structure Design」** 技能对齐，要点如下：

| 项 | 要求 |
|----|------|
| 文件夹 | `type: "path"`（小写）；类型层目录 **`name`** 必须为 **`Action` / `Metric` / `State`**（Pascal，与 Tier0 技能示例一致）；同节点 **`dataType`** 仍为 **`ACTION` / `METRIC` / `STATE`**（大写枚举）；业务文件夹为 **`NORMAL`** |
| 叶子 | `type: "topic"`（小写）；**`topicType`** 必须与父类型文件夹 **`name` 字符串完全一致**（即 **`Action` / `Metric` / `State`**，否则导入器报错：`Parent type mismatch: file topicType must match enum folder`）；`alias` = 父级 `alias` + `_` + 当前节点 `name` |
| **Metric 叶子** | `dataType: "TIME_SEQUENCE_TYPE"`；**`schema`** 必填（平台校验：`schema required for metric`），数组内为**数值型**字段（如 `DOUBLE` / `INTEGER`），与 `fields` 二选一时以 **`schema`** 为准 |
| **State / Action 叶子** | `dataType: "JSONB_TYPE"`；**`fields`** **仅一项**：`name: "json"`, `type: "STRING"`, `maxLen`（如 2048）；业务对象需 **`JSON.stringify`** 后放入 `json` |
| 元数据键名 | **Metric → `schema`**；**State/Action（JSONB）→ `fields`**（与当前 Tier0 导入器行为一致） |
| 其它叶子属性 | `generateDashboard`、`enableHistory`、`mockData`、`extendProperties` 等按平台要求保留 |

**MQTT**：`State`/`Action` 消息体应为 **`{ "json": "<stringified object>" }`**。**Topic 路径**与树一致时，类型段为 **`Action` / `Metric` / `State`**（Pascal），例如 `TEP_Plant/Reactor/State/reactor_pressure`（不是全大写 `STATE`）。

---

## 1. 建议：`process_status` 用哪种类型？

### 结论（推荐）

在 **当前已有 Node-RED 发 `"RUNNING"` 字符串**、且主要用于 **大屏/演示/人工阅读** 的前提下，推荐：

- **`value` 使用 `STRING`**（如 `RUNNING`、`STOPPED`、`FAULT`、`MAINTENANCE`）。
- 在 Tier0 import 里 **`STATE` 仍为单字段 `json`（STRING）**；字符串状态写在 **内层**对象中，例如 `json: JSON.stringify({ value: "RUNNING", quality: 0 })`。
- **修改 description**，改为明确说明「枚举字符串状态」，**不要**再写「0=正常、非零=故障码」——除非你真的改为发数字。

这样 **描述、import 元数据（Metric 的 `schema` / State·Action 的 `fields`）、真实 MQTT 三边一致**，改动最小、最不容易在平台上踩校验坑。

### 何时改用数字故障码（INTEGER）

在以下情况再选 **整数 `value`（如 0=正常，非 0=故障码）**：

- 对接 **PLC/DCS** 只提供寄存器整型；或  
- 历史库/告警规则已按 **数值比较** 配置；或  
- 文档与仿真必须与 **原 TEP/XMEAS 数字语义** 严格一致。

若选 INTEGER：**同时改 Node-RED**（发 `0` 等）和 **description + 内层 `json` 字符串内容**，三边仍要统一。

### 不推荐

- description 写「数字码」、MQTT 却发 **`"RUNNING"`** —— 对人、对校验、对后续集成都会混淆。

---

## 2. 核心规则：Metric 用 `schema`，State/Action 用 `fields`（Tier0）

### 问题现象

- MQTT **有 payload**，但平台 UI 里 **Schema 仍显示 No data**，或导入报 **`schema required for metric`**。  
- 常见原因：**Metric** 必须用键名 **`schema`**（仅用 **`fields`** 会被忽略）；**State/Action** 用 **`JSONB_TYPE` + `fields` 里的 `json`（STRING）**。

### 规则

**叶子节点（`type: "topic"`）须有与 `dataType` 匹配的元数据：Metric → 非空 `schema`；State/Action → 非空 `fields`；且 `topicType` 与父文件夹 `name` 一致。**

- **Metric**：**`schema`** 列出各数值列（`value`、`quality`、`comp_*` 等）。  
- **State / Action**：**`fields`** 仅为 **`json`（STRING）**；业务结构放在该字符串内。

---

## 3. `schema` / `fields` 与真实 MQTT payload 一致（Tier0）

| 原则 | 说明 |
|------|------|
| **Metric** | MQTT 解析后的对象键名与 **`schema[].name`** 一致（如 `value`、`quality`、`comp_*`）；类型为 `DOUBLE`/`INTEGER` 等数值型。 |
| **STATE / ACTION** | 外层须有 **`json`** 键；**内层**（`JSON.parse(json)`）的业务键与 Node-RED 约定一致（如 `value`、`unit`、`quality`）。 |
| **类型一致** | `schema`（Metric）或内层 JSON（State/Action）声明的类型与解析后值一致。 |
| **多余字段** | 以平台校验规则为准；内层对象尽量与文档描述一致。 |

### TEP + Tier0 示例

**STATE / ACTION（Tier0）：** MQTT 负载形如：

```json
{
  "json": "{\"value\":123.45,\"unit\":\"%\",\"quality\":0}"
}
```

**Metric 标量：** 仍为扁平数值对象（与 **`schema`** 声明一致）：

```json
{ "value": 123.45, "quality": 0 }
```

**Metric 组分：** `schema` 列出所有 `comp_*` 与 `quality`；payload 与之一一对应。

**process_status（字符串方案）：** 内层例如 `JSON.stringify({ value: "RUNNING", quality: 0 })` 置于 `json` 中。

---

## 4. Topic 路径与 MQTT 必须逐字一致

- Import 树拼接出的 **完整 topic**（如 `TEP_Plant/Reactor/State/reactor_temperature`）必须与 Node-RED **mqtt out 的 topic 字符串完全一致**（大小写、下划线、段数）。
- 平台按 topic 绑定数据；**差一个字符**会导致「有流量但绑定不到该节点」或实时页无值。

---

## 5. `topicType` 与路径层级

- 保持路径中 **State / Action / Metric**（或平台要求的 `Metrics`）在 **约定层级**（许多规范要求类型在倒数第二层）。
- 叶子 **`topicType`** 与父类型文件夹 **`name`** 字符串一致（`Action` / `Metric` / `State`）。若导入后被改成全大写 `ACTION` 等且再报 parent mismatch，以平台导出为准改回 Pascal。

---

## 6. 描述（description）与数据模型分离清楚

- **description**：给人看的说明；若写「数字故障码」，则内层 `json` 解析后的对象必须按数字实现。  
- **`schema` / `fields`**：机器用的结构；以 **实际 MQTT** 为准，不要用 description 代替。

---

## 7. 与 UNS 信封（envelope）的关系

若平台要求消息体为：

```json
{ "version": "v1", "topics": [{ "path": "...", "type": "state", "value": { ... } }] }
```

则 **内层业务对象**仍应对齐约定，但 **最外层**多一层信封；需在 Node-RED 或网关统一，并与平台文档一致。

**Tier0 的 STATE/ACTION** 在「单键 `json`」之上还可能再叠 UNS 信封，以平台文档为准。

---

## 8. Import 前自检清单（给其他 LLM 可直接当 prompt）

1. 列出所有 `type: "topic"` 节点。  
2. 确认 **Metric** 有非空 **`schema`**、**State/Action** 有非空 **`fields`**，且 **`dataType`** 与 `topicType` 匹配。  
3. **Metric**：对照扁平 JSON 样例核对 **`schema`**。  
4. **State/Action**：对照 **`json` 字符串解析后的对象**核对业务字段。  
5. **`process_status`**：description 与内层 `value` 类型一致（字符串或整数方案二选一）。  
6. 拼接完整 topic，与 MQTT 发布 topic **字符串完全一致**（类型段为 **`State`/`Action`/`Metric`**，Pascal）。  
7. **Metric** 叶子的 `quality` 在 **`schema`** 中为 `INTEGER`。

---

## 9. 如何避免「Action / State 在 UI 无 schema」

**做法**：**State / Action** 叶子使用 **`JSONB_TYPE` + 单一 `json`（STRING）** 的 **`fields`**；**Metric** 叶子使用 **`TIME_SEQUENCE_TYPE` + 数值型 `schema`**；类型文件夹 **`name`** 为 **`Action`/`Metric`/`State`**，**`dataType`** 为 **`ACTION`/`METRIC`/`STATE`**。

可操作习惯：

- 新建叶子时按 `topicType` 选模板（JSONB 一条 `json` vs 时序多条数值列）。  
- 自动化校验：每个 **Metric** `topic` 含非空 **`schema`**，每个 **State/Action** 含非空 **`fields`**。

---

## 10. 参考文档

- 本仓库 Henkel 前端 MQTT 合同：[`MQTT_CONTRACT.md`](./MQTT_CONTRACT.md)  
- **TEP_Plant 完整 import 示例**（Tier0：`path`/`topic`、**Metric `schema`**、**State/Action `fields`**、`alias`、类型夹 **`Action`/`Metric`/`State`**）：[`TEP_Plant_UNS_namespace.json`](./TEP_Plant_UNS_namespace.json)  
- 本文：**namespace import JSON** 与 **仿真/设备 payload** 对齐；**State/Action** 须配合 **`json` 字符串封装**。

---

*文档版本：TEP import 与 Tier0 对齐；类型夹 Pascal `name` + 大写 `dataType`；叶子 `topicType` 与夹名一致；Metric 扁平数值，State/Action 为 `{ json: stringified }`。*
