# DDD Refactor 学习成果记录

本文档用于**追踪和输出**你在各分支上的学习成果：从无 domain/validator，到 Master Data 的 Validator，再到 Inbound / Outbound 的 Validator + Service。合并前可据此回顾「我加了什么、学会了什么」。

---

## 一、基准：合并前各分支在 `src/domain/` 的差异（Git 统计）

以下为实际执行 `git diff --stat` 的结果，可复现。

### 1. feature/demo-build → feature/ddd-refactor-inbound（Inbound 阶段新增）

| 文件 | 新增行数 |
|------|----------|
| src/domain/inbound/ExceptionService.js | 53 |
| src/domain/inbound/ExceptionValidator.js | 99 |
| src/domain/inbound/InboundOrderService.js | 33 |
| src/domain/inbound/InboundOrderValidator.js | 138 |
| src/domain/inbound/PutawayTaskService.js | 93 |
| src/domain/inbound/PutawayTaskValidator.js | 63 |
| src/domain/inbound/ReceiptService.js | 78 |
| src/domain/inbound/ReceiptValidator.js | 112 |
| src/domain/warehouse/WarehouseValidator.js | 19（修改/补充） |
| **合计** | **9 个文件，+688 行** |

### 2. feature/demo-build → feature/ddd-refactor-outbound（到 Outbound 阶段总新增）

| 文件 | 状态 | 新增行数 |
|------|------|----------|
| src/domain/inbound/ExceptionService.js | A 新增 | 53 |
| src/domain/inbound/ExceptionValidator.js | A 新增 | 99 |
| src/domain/inbound/InboundOrderService.js | A 新增 | 33 |
| src/domain/inbound/InboundOrderValidator.js | A 新增 | 138 |
| src/domain/inbound/PutawayTaskService.js | A 新增 | 93 |
| src/domain/inbound/PutawayTaskValidator.js | A 新增 | 63 |
| src/domain/inbound/ReceiptService.js | A 新增 | 78 |
| src/domain/inbound/ReceiptValidator.js | A 新增 | 112 |
| src/domain/outbound/OutboundOrderService.js | A 新增 | 626 |
| src/domain/outbound/OutboundOrderValidator.js | A 新增 | 676 |
| src/domain/outbound/PickingTaskService.js | A 新增 | 174 |
| src/domain/outbound/PickingTaskValidator.js | A 新增 | 133 |
| src/domain/outbound/WaveService.js | A 新增 | 360 |
| src/domain/warehouse/WarehouseValidator.js | M 修改 | 19 |
| src/domain/worker/WorkerValidator.js | A 新增 | 145 |
| **合计** | **15 个文件** | **+2802 行** |

（A = Added，M = Modified）

---

## 二、按学习阶段归纳：你「加了什么」

### 阶段 0：feature/demo-build（Master Data 的 domain 起步）

- **之前**：没有 `src/domain/` 文件夹，校验和逻辑都写在页面里（vibe code）。
- **在 demo-build 里你已有的学习成果**：
  - 建立了 `src/domain/`，并有了第一批 **Validator**（无 Service）：
    - ContainerValidator.js  
    - LocationValidator.js  
    - MaterialValidator.js  
    - PartnerValidator.js  
    - WarehouseValidator.js  
  - 学会：**把校验从页面抽到 Validator**，页面只负责调用和展示。

### 阶段 1：feature/ddd-refactor-inbound（Inbound 的 Validator + Service）

- **相对 demo-build 新增**：
  - **Inbound 领域**：8 个新文件（4 个 Validator + 4 个 Service）
  - **WarehouseValidator** 的补充/修改
- **学会**：
  - **Validator**：业务规则、状态/类型校验、自定义 `*ValidationError`
  - **Service**：`buildCreateCommand` 等，把 UI 数据格式化成 MQTT 所需格式
  - 页面变薄：只做 `try { Service.xxx(); publish(); } catch (ValidationError) { alert(); }`

### 阶段 2：feature/ddd-refactor-outbound（Outbound 的 Validator + Service）

- **相对 inbound 再新增**：
  - **Outbound 领域**：5 个新文件（2 Validator + 3 Service）
  - **WorkerValidator**
- **学会**：
  - 多数据源合并（costing / sync / shipment）的归一化与合并逻辑（如 `normalizeOrder`、`mergeOrders`）
  - 状态机、工作流（审批、Hold、Wave、Allocate 等）在 Validator/Service 中的表达
  - 与 Inbound 相同的模式在更复杂业务上的应用

---

## 三、如何自己复现这些数字（追踪用）

在项目根目录执行，即可重新得到和上面一致的统计，便于以后「输出结果」或写总结：

```bash
# Inbound 阶段：相对 demo-build 在 domain 的变更
git diff --stat feature/demo-build feature/ddd-refactor-inbound -- src/domain/

# Outbound 阶段：相对 demo-build 在 domain 的完整变更
git diff --stat feature/demo-build feature/ddd-refactor-outbound -- src/domain/

# 只看「新增/修改了哪些文件」（不显示行数）
git diff --name-status feature/demo-build feature/ddd-refactor-outbound -- src/domain/
```

---

## 四、可当作「学习成果输出」的一两句话总结

- **Master Data（demo-build）**：从无到有建立 `src/domain/`，用 5 个 Validator 把物料/库位/仓库/伙伴/容器的校验从页面里抽离出来。
- **Inbound（ddd-refactor-inbound）**：在 Master Data 基础上，为入库模块增加 4 对 Validator+Service，学会「校验 + 命令构建」的 DDD 前端用法。
- **Outbound（ddd-refactor-outbound）**：在 Inbound 基础上，为出库模块增加 2 个 Validator、3 个 Service 和 WorkerValidator，学会多源数据合并与工作流状态校验。

合并后，这条分支会同时包含以上三块学习成果；本文档保留的是**合并前**各阶段在 `src/domain/` 的**可追踪、可复现**的记录。

---

*文档生成后可用 Git 提交，便于长期保留和分享。*
