USE hermes_settle;

-- 账户域
CREATE TABLE hwt_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(64) NOT NULL COMMENT '用户名',
  real_name VARCHAR(64) NULL COMMENT '真实姓名',
  identity_card VARCHAR(32) NULL COMMENT '身份证号',
  mobile VARCHAR(20) NULL COMMENT '手机号',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包用户';

CREATE TABLE hwt_account (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  account_code VARCHAR(64) NOT NULL COMMENT '账户唯一编码',
  account_type VARCHAR(32) NULL COMMENT '账户类型',
  finance_body_code VARCHAR(64) NULL COMMENT '财务主体编码',
  finance_body_name VARCHAR(128) NULL COMMENT '财务主体名称',
  wallet_id VARCHAR(64) NULL COMMENT '钱包ID',
  smid VARCHAR(64) NULL COMMENT '二级商户ID',
  enable_status TINYINT NOT NULL DEFAULT 1 COMMENT '启用状态',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_account_code (account_code),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包主账户';

CREATE TABLE hwt_sub_account (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(64) NOT NULL COMMENT '主账户编码',
  sub_account_code VARCHAR(64) NOT NULL COMMENT '子账户编码',
  sub_account_type VARCHAR(32) NULL COMMENT '子账户类型',
  balance_type VARCHAR(32) NULL COMMENT '余额类型',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '可用余额',
  frozen_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '冻结余额',
  biz_code VARCHAR(64) NULL COMMENT '业务编号',
  enable_status TINYINT NOT NULL DEFAULT 1 COMMENT '启用状态',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_sub_account_code (sub_account_code),
  KEY idx_account_code (account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包子账户';

CREATE TABLE hwt_biz_user_relation (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  biz_type VARCHAR(32) NOT NULL COMMENT '业务方类型',
  biz_code VARCHAR(64) NOT NULL COMMENT '业务方编号',
  biz_name VARCHAR(128) NULL COMMENT '业务方名称',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  account_code VARCHAR(64) NOT NULL COMMENT '关联账户编码',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_biz_code (biz_code),
  KEY idx_account_code (account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务方与用户映射';

-- 交易域
CREATE TABLE hwt_trade_info (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trade_code VARCHAR(64) NOT NULL COMMENT '交易单号',
  trade_type VARCHAR(32) NULL COMMENT '交易类型',
  biz_type VARCHAR(32) NULL COMMENT '业务类型',
  biz_code VARCHAR(64) NULL COMMENT '业务编号',
  from_account_code VARCHAR(64) NULL COMMENT '转出账户',
  from_sub_account_code VARCHAR(64) NULL COMMENT '转出子账户',
  to_account_code VARCHAR(64) NULL COMMENT '转入账户',
  to_sub_account_code VARCHAR(64) NULL COMMENT '转入子账户',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '交易金额',
  third_trade_no VARCHAR(64) NULL COMMENT '三方流水号',
  trade_status VARCHAR(32) NOT NULL COMMENT '交易状态',
  return_code VARCHAR(32) NULL COMMENT '返回码',
  execute_time DATETIME NULL COMMENT '执行时间',
  finish_time DATETIME NULL COMMENT '完成时间',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_trade_code (trade_code),
  KEY idx_biz (biz_type, biz_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钱包交易主表';

CREATE TABLE hwt_account_change_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trade_code VARCHAR(64) NOT NULL COMMENT '关联交易单号',
  account_code VARCHAR(64) NOT NULL COMMENT '账户编码',
  sub_account_code VARCHAR(64) NULL COMMENT '子账户编码',
  change_amount DECIMAL(18,2) NOT NULL COMMENT '变动金额',
  balance_after DECIMAL(18,2) NOT NULL COMMENT '变动后余额',
  change_type VARCHAR(32) NULL COMMENT '变动类型',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  KEY idx_trade_code (trade_code),
  KEY idx_account_code (account_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账户余额变动流水';

-- 结算域
CREATE TABLE hst_stock_record (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(64) NOT NULL COMMENT '库存唯一单号',
  depot_code VARCHAR(64) NOT NULL COMMENT '门店编号',
  biz_code VARCHAR(64) NULL COMMENT '业务编号',
  courier_code VARCHAR(64) NULL COMMENT '业务员编号',
  express_company_code VARCHAR(32) NULL COMMENT '快递公司编码',
  settlement_type VARCHAR(32) NULL COMMENT '合作类型',
  enter_source TINYINT NULL COMMENT '入库来源',
  settle_status TINYINT NOT NULL DEFAULT 0 COMMENT '结算状态',
  upload_date DATETIME NULL COMMENT '入库时间',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_serial_number (serial_number),
  KEY idx_depot_code (depot_code),
  KEY idx_courier_code (courier_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='派费库存源数据';

CREATE TABLE hst_order (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(64) NOT NULL COMMENT '订单号',
  order_type VARCHAR(64) NOT NULL COMMENT '订单类型',
  object_code VARCHAR(64) NOT NULL COMMENT '分表键',
  biz_code VARCHAR(64) NULL COMMENT '业务编号',
  biz_type VARCHAR(32) NULL COMMENT '业务类型',
  biz_order_code VARCHAR(64) NULL COMMENT '业务订单号',
  order_amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
  actual_pay_amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '实际支付金额',
  order_status TINYINT NOT NULL DEFAULT 1 COMMENT '订单状态',
  refund_status TINYINT NOT NULL DEFAULT 0 COMMENT '退款状态',
  split_rule TEXT NULL COMMENT '分账规则JSON',
  business_time DATETIME NULL COMMENT '业务时间',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_order_code (order_code),
  KEY idx_object_code (object_code),
  KEY idx_biz_order_code (biz_order_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算主订单';

CREATE TABLE hst_pay_order (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pay_code VARCHAR(64) NOT NULL COMMENT '支付流水号',
  order_code VARCHAR(64) NOT NULL COMMENT '主单号',
  object_code VARCHAR(64) NOT NULL COMMENT '分表键',
  pay_amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '支付金额',
  pay_object_type VARCHAR(32) NULL COMMENT '付款方类型',
  pay_object VARCHAR(64) NULL COMMENT '付款方',
  rec_object_type VARCHAR(32) NULL COMMENT '收款方类型',
  rec_object VARCHAR(64) NULL COMMENT '收款方',
  pay_status VARCHAR(32) NOT NULL COMMENT '支付状态',
  pay_type TINYINT NULL COMMENT '支付方式',
  trade_code VARCHAR(64) NULL COMMENT '关联交易单号',
  bill_no VARCHAR(64) NULL COMMENT '关联账单号',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_pay_code (pay_code),
  KEY idx_order_code (order_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付代扣子单';

CREATE TABLE hst_bill (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bill_no VARCHAR(64) NOT NULL COMMENT '账单号',
  month_bill_no VARCHAR(64) NULL COMMENT '月账单号',
  bill_type VARCHAR(32) NULL COMMENT '账单类型',
  actual_bill_amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '账单金额',
  bill_status TINYINT NOT NULL DEFAULT 0 COMMENT '账单状态',
  pay_object_type VARCHAR(32) NULL COMMENT '付款方类型',
  pay_object VARCHAR(64) NULL COMMENT '付款方',
  rec_object_type VARCHAR(32) NULL COMMENT '收款方类型',
  rec_object VARCHAR(64) NULL COMMENT '收款方',
  business_begin_time DATETIME NULL COMMENT '账期开始',
  business_end_time DATETIME NULL COMMENT '账期结束',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_bill_no (bill_no),
  KEY idx_bill_status (bill_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算账单';

CREATE TABLE hst_bill_item (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bill_no VARCHAR(64) NULL COMMENT '账单号',
  biz_type VARCHAR(32) NULL COMMENT '业务类型',
  trade_biz_type VARCHAR(32) NULL COMMENT '交易业务类型',
  biz_code VARCHAR(64) NULL COMMENT '业务编号',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '金额',
  pay_object VARCHAR(64) NULL COMMENT '付款方',
  rec_object VARCHAR(64) NULL COMMENT '收款方',
  trade_code VARCHAR(64) NULL COMMENT '关联交易单号',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '明细状态',
  pay_status VARCHAR(32) NULL COMMENT '支付状态',
  alignment_flag VARCHAR(32) NULL COMMENT '对账结果',
  unique_code VARCHAR(64) NOT NULL COMMENT '明细唯一编号',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_unique_code (unique_code),
  KEY idx_bill_no (bill_no),
  KEY idx_trade_code (trade_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算账单明细';

-- 账务域
CREATE TABLE fund_flow (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL COMMENT '幂等流水号',
  business_code VARCHAR(64) NULL COMMENT '业务单号',
  channel_code VARCHAR(32) NULL COMMENT '渠道编码',
  main_account_id BIGINT NULL COMMENT '主账户ID',
  sub_account_id VARCHAR(64) NULL COMMENT '子账户ID',
  amount DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '交易金额',
  in_ex_type TINYINT NOT NULL COMMENT '收支类型',
  pay_type TINYINT NULL COMMENT '支付方式',
  pay_trade_no VARCHAR(64) NULL COMMENT '三方流水号',
  settlement_id BIGINT NULL COMMENT '结算表ID',
  trade_id BIGINT NULL COMMENT '交易表ID',
  finance_subject_code VARCHAR(32) NULL COMMENT '会计科目',
  settlement_type_code VARCHAR(32) NULL COMMENT '结算类型',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_business_id (business_id),
  KEY idx_trade_id (trade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金流水';

-- 业务员域
CREATE TABLE nl_courier (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  staff_code VARCHAR(64) NOT NULL COMMENT '业务员编号',
  name VARCHAR(64) NOT NULL COMMENT '姓名',
  account VARCHAR(20) NULL COMMENT '手机号',
  enable TINYINT NOT NULL DEFAULT 1 COMMENT '启用状态',
  depot_code VARCHAR(64) NULL COMMENT '所属门店',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_staff_code (staff_code),
  KEY idx_depot_code (depot_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务员信息';

CREATE TABLE nl_courier_wallet (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  staff_code VARCHAR(64) NOT NULL COMMENT '业务员编号',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '可用余额',
  frozen_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '冻结余额',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_staff_code (staff_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务员钱包';

-- 门店资金域
CREATE TABLE nl_store_fund_account (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  depot_code VARCHAR(64) NOT NULL COMMENT '门店编号',
  balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '可用余额',
  frozen_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '冻结余额',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_depot_code (depot_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店资金账户';

CREATE TABLE nl_store_fund_account_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  depot_code VARCHAR(64) NOT NULL COMMENT '门店编号',
  trade_code VARCHAR(64) NOT NULL COMMENT '交易号',
  change_amount DECIMAL(18,2) NOT NULL COMMENT '变动金额',
  balance_after DECIMAL(18,2) NOT NULL COMMENT '变动后余额',
  trade_type VARCHAR(32) NULL COMMENT '交易类型',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  KEY idx_depot_code (depot_code),
  KEY idx_trade_code (trade_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店资金流水';

-- 对账域
CREATE TABLE keeper_task_info (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT NOT NULL COMMENT '任务雪花ID',
  task_code VARCHAR(64) NOT NULL COMMENT '任务编号',
  task_name VARCHAR(128) NOT NULL COMMENT '任务名称',
  task_type TINYINT NOT NULL DEFAULT 0 COMMENT '任务类型',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  script_express TEXT NULL COMMENT '核对脚本',
  check_before_day INT NULL COMMENT 'T+N核对天数',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_task_id (task_id),
  UNIQUE KEY uk_task_code (task_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据核对任务';

CREATE TABLE keeper_check_error_detail (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  check_error_detail_id BIGINT NOT NULL COMMENT '异常明细ID',
  task_id BIGINT NOT NULL COMMENT '任务ID',
  business_id VARCHAR(64) NULL COMMENT '业务ID',
  content TEXT NULL COMMENT '异常内容',
  source_type TINYINT NOT NULL DEFAULT 0 COMMENT '来源类型',
  gmt_create DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_detail_id (check_error_detail_id),
  KEY idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核对异常明细';
