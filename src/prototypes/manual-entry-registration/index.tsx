/**
 * @name 人工入厂登记
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - 用户提供的人工入厂登记截图与功能需求
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import {
  ClearOutlined,
  CreditCardOutlined,
  IdcardOutlined,
  PlusSquareOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import {
  INITIAL_RECORDS,
  ORIGINAL_MODE_LABEL,
  PLAN_MODE_LABEL,
  PLANS,
  PRE_ENTRIES,
  SAMPLE_METHODS,
  SAMPLE_POSITIONS,
  SITES,
  TRANSPORTERS,
  UNLOAD_AREAS,
  WEIGH_POSITIONS,
  findPlan,
  findPlanByPlate,
  findPreEntry,
  mineCardSample,
  nextSerial,
  yunyiExpiredSample,
  yunyiSample,
  type CoalPlan,
  type EntryRecord,
  type PreEntryVehicle,
  type RegisterMode,
  type SiteConfig,
} from './data';
import { applyPlan, isYunyiFresh, parseMineCard, parseYunyi } from './parse';
import AllowEntryDrawer from './components/AllowEntryDrawer';
import PlanSelectModal from './components/PlanSelectModal';
import ScanModal, { type ScanKind } from './components/ScanModal';
import {
  ReissuePickModal,
  SampleCardQueryDrawer,
  SampleCardWriteModal,
  type CardLog,
} from './components/SampleCardModal';

interface FormValues {
  plate?: string;
  supplier?: string;
  mine?: string;
  coalType?: string;
  transporter?: string;
  productName?: string;
  vehicleCard?: string;
  gross?: number | null;
  tare?: number | null;
  net?: number | null;
  shipTime?: Dayjs | null;
  station?: string;
  samplePos?: string;
  weighPos?: string;
  unloadArea?: string;
  sampleMethod?: string;
  entryCard?: string;
  planId?: string;
}

const weightRule = [
  { type: 'number' as const, min: 0, max: 199.999, message: '须为小于 200 的小数' },
];

const ManualEntryRegistration: React.FC = () => {
  const [form] = Form.useForm<FormValues>();
  const [siteId, setSiteId] = useState(SITES[0].id);
  const [mode, setMode] = useState<RegisterMode>('incoming');
  const [vehicles, setVehicles] = useState<PreEntryVehicle[]>(() => PRE_ENTRIES.map((v) => ({ ...v })));
  const [records, setRecords] = useState<EntryRecord[]>(INITIAL_RECORDS);
  const [cardLogs, setCardLogs] = useState<CardLog[]>([
    {
      id: 'C0',
      plate: '桂A8T216',
      serialNo: 'RCJ202608250018',
      writtenAt: '2026-08-25 08:47:01',
      kind: 'issue',
    },
  ]);
  const [planOpen, setPlanOpen] = useState(false);
  const [allowOpen, setAllowOpen] = useState(false);
  const [scan, setScan] = useState<{ open: boolean; kind: ScanKind; loading: boolean }>({
    open: false,
    kind: 'yunyi',
    loading: false,
  });
  const [write, setWrite] = useState<{ open: boolean; plate: string; serialNo: string; kind: 'issue' | 'reissue' }>({
    open: false,
    plate: '',
    serialNo: '',
    kind: 'issue',
  });
  const [queryOpen, setQueryOpen] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [view, setView] = useState<EntryRecord | null>(null);
  const [log, setLog] = useState('');
  const [scanBusy, setScanBusy] = useState<ScanKind | null>(null);

  const site = SITES.find((s) => s.id === siteId) ?? SITES[0];
  const plateWatch = Form.useWatch('plate', form);
  const livePre = plateWatch
    ? vehicles.find((v) => v.plate.replace(/\s/g, '') === plateWatch.replace(/\s/g, ''))
    : undefined;

  const fillPlan = (plan: CoalPlan, withWeights: boolean) => {
    const base = applyPlan(plan);
    const preHit = vehicles.find((v) => v.plate === plan.plate);
    form.setFieldsValue({
      ...base,
      shipTime: plan.shipTime ? dayjs(plan.shipTime) : null,
      vehicleCard: preHit?.vehicleCard,
      entryCard: preHit?.entryCard || form.getFieldValue('entryCard'),
      sampleMethod: form.getFieldValue('sampleMethod') || '机械采样',
      ...(withWeights ? { gross: plan.gross, tare: plan.tare, net: plan.net } : {}),
    });
  };

  const shouldFillWeights = (cfg: SiteConfig, from: 'plan' | 'pre' | 'card' | 'yunyi') => {
    if (cfg.GET_ORIGINAL_MSG === 1) return from === 'pre' || from === 'plan';
    if (cfg.GET_ORIGINAL_MSG === 2) return from === 'card';
    if (cfg.GET_ORIGINAL_MSG === 3) return false;
    if (cfg.GET_ORIGINAL_MSG === 4) return from === 'yunyi';
    return false;
  };

  const openScan = (kind: ScanKind) => {
    setScanBusy(kind);
    window.setTimeout(() => {
      setScanBusy(null);
      setScan({ open: true, kind, loading: false });
    }, 450);
  };

  const handlePlanPick = (plan: CoalPlan) => {
    fillPlan(plan, shouldFillWeights(site, 'plan'));
    setPlanOpen(false);
    message.success(`已回填计划 ${plan.serialNo}`);
  };

  const handlePlateMatch = () => {
    if (site.GET_PLAN_MSG !== 3) return;
    const plate = (form.getFieldValue('plate') as string | undefined)?.trim();
    if (!plate) return;
    const plan = findPlanByPlate(plate);
    if (!plan) {
      message.warning('未匹配到来煤计划');
      return;
    }
    fillPlan(plan, shouldFillWeights(site, 'plan'));
    message.success(`已按车牌匹配计划 ${plan.serialNo}`);
  };

  const loadPreEntryWeights = () => {
    const plate = (form.getFieldValue('plate') as string | undefined)?.trim();
    if (!plate) {
      message.warning('请先填写车牌');
      return;
    }
    const hit = vehicles.find((v) => v.plate === plate) ?? findPreEntry(plate);
    const plan = hit ? findPlan(hit.planId) : findPlanByPlate(plate);
    if (!plan) {
      message.warning('未查到预入厂 / 计划信息');
      return;
    }
    fillPlan(plan, true);
    message.success('已获取预入厂矿发信息');
  };

  const handleScan = (raw: string) => {
    if (scan.kind === 'plan-qr') {
      const plan = findPlan(raw.trim());
      if (!plan) {
        message.error('未查询到入厂计划信息');
        return;
      }
      fillPlan(plan, shouldFillWeights(site, 'plan'));
      setScan((s) => ({ ...s, open: false }));
      message.success('计划二维码已回填');
      return;
    }
    if (scan.kind === 'yunyi') {
      const parsed = parseYunyi(raw);
      if (!parsed) {
        message.error('云驿二维码格式无法解析');
        return;
      }
      if (!isYunyiFresh(parsed.qrTime)) {
        message.error('二维码失效，请刷新！');
        return;
      }
      const plan = findPlan(parsed.planId);
      if (!plan) {
        message.error('未查询到入厂计划信息');
        return;
      }
      fillPlan(plan, false);
      form.setFieldsValue({
        plate: parsed.plate,
        shipTime: parsed.stationTime ? dayjs(parsed.stationTime) : dayjs(plan.shipTime),
        ...(shouldFillWeights(site, 'yunyi')
          ? { gross: parsed.gross, tare: parsed.tare, net: parsed.net }
          : {}),
      });
      setScan((s) => ({ ...s, open: false }));
      message.success('云驿二维码已回填');
      return;
    }
    const card = parseMineCard(raw);
    if (!card) {
      message.error('矿发卡内容无法解析');
      return;
    }
    const formPlate = ((form.getFieldValue('plate') as string | undefined) || '').trim();
    const applyCard = () => {
      const plan = findPlan(card.planId);
      if (!plan) {
        message.error('未查询到入厂计划信息');
        return;
      }
      fillPlan(plan, shouldFillWeights(site, 'card'));
      if (shouldFillWeights(site, 'card')) {
        form.setFieldsValue({
          gross: card.gross,
          tare: card.tare,
          net: Number((card.gross - card.tare).toFixed(3)),
        });
      }
      if (!formPlate) form.setFieldsValue({ plate: card.cardPlate });
      setScan((s) => ({ ...s, open: false }));
      message.success('矿发卡已回填');
    };
    if (formPlate && formPlate !== card.cardPlate) {
      Modal.confirm({
        title: '车牌不一致',
        content: `输入车牌与读卡车辆车牌不匹配，矿发卡车牌为：${card.cardPlate}`,
        okText: '仍使用读卡结果',
        cancelText: '取消',
        onOk: applyCard,
      });
      return;
    }
    applyCard();
  };

  const handleAllow = (plate: string) => {
    setVehicles((list) => list.map((v) => (v.plate === plate ? { ...v, permit: 'allowed' } : v)));
    message.success(`${plate} 已更新为允许入厂`);
  };

  const fillFromPlate = (plate: string) => {
    const hit = vehicles.find((v) => v.plate === plate) ?? findPreEntry(plate);
    const plan = hit ? findPlan(hit.planId) : findPlanByPlate(plate);
    if (plan) fillPlan(plan, shouldFillWeights(site, 'pre') || shouldFillWeights(site, 'plan'));
    form.setFieldsValue({ plate });
    setAllowOpen(false);
  };

  const submit = async (issueCard: boolean) => {
    try {
      const values = await form.validateFields();
      const plate = values.plate!.trim();
      const permit = vehicles.find((v) => v.plate === plate);
      if (permit?.permit === 'forbidden') {
        message.error('该车辆仍为禁止入厂登记，请先办理允许入厂');
        setAllowOpen(true);
        return;
      }
      const tempCard = values.entryCard?.startsWith('YC-TMP') ? values.entryCard : '';
      const fixedCard = values.entryCard && !tempCard ? values.entryCard : '';
      const uploaded = site.ENABLE_ENTER_CARD ? tempCard || fixedCard || '' : '';
      const serialNo = nextSerial(records);
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const row: EntryRecord = {
        id: `R${Date.now()}`,
        serialNo,
        plate,
        supplier: values.supplier || '—',
        mine: values.mine || '—',
        coalType: values.coalType || '—',
        sampleMethod: values.sampleMethod || '机械采样',
        net: Number(values.net),
        weighPos: values.weighPos || '—',
        samplePos: values.samplePos || '—',
        enterAt: now,
        status: issueCard ? 'card-issued' : 'registered',
        entryCard: uploaded,
        mode,
        siteId: site.id,
      };
      setRecords((list) => [row, ...list]);
      const lines = [
        `[模块日志] 入厂登记成功 ${plate} ${serialNo}`,
        `道闸抬杆 YKEnterBarrierGateUp / YKBarrierGateUp`,
        `LED 显示：${plate} 登记成功`,
        `广播播报：${plate} 请入厂，前往${values.samplePos || '采样位'} ${values.weighPos || '过衡位'}`,
        uploaded ? `上传卡号：${uploaded}（临时卡＞固定卡＞无卡号）` : '未上传入厂卡号',
      ];
      setLog(lines.join('\n'));
      message.success('登记成功');
      if (issueCard) {
        setWrite({ open: true, plate, serialNo, kind: 'issue' });
      }
    } catch {
      /* antd 已展示校验 */
    }
  };

  const sampleRequired = site.SAMPLE_MEASURE_EDIT === 1;
  const filteredRecords = records.filter((r) => r.siteId === site.id);

  const columns: ColumnsType<EntryRecord> = [
    { title: '序号', width: 64, render: (_, __, i) => i + 1 },
    { title: '流水号', dataIndex: 'serialNo', width: 160 },
    {
      title: '类型',
      dataIndex: 'mode',
      width: 90,
      render: (m: RegisterMode) => (m === 'transfer' ? <Tag>转场煤</Tag> : <Tag color="blue">来煤</Tag>),
    },
    { title: '车牌号', dataIndex: 'plate', width: 110 },
    { title: '供应商', dataIndex: 'supplier', width: 150, ellipsis: true },
    { title: '矿点', dataIndex: 'mine', width: 110 },
    { title: '煤种', dataIndex: 'coalType', width: 90 },
    { title: '采样方式', dataIndex: 'sampleMethod', width: 100 },
    { title: '矿发净重(t)', dataIndex: 'net', width: 110 },
    { title: '过衡位', dataIndex: 'weighPos', width: 110 },
    { title: '采样位', dataIndex: 'samplePos', width: 130 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 170 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: EntryRecord['status']) =>
        s === 'card-issued' ? <Tag color="processing">已发卡</Tag> : <Tag>已登记</Tag>,
    },
    {
      title: '操作',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => setView(row)}>
            查看
          </Button>
          {site.ENABLE_ENTER_SAMPLE_CARD ? (
            <Button
              type="link"
              size="small"
              onClick={() => setWrite({ open: true, plate: row.plate, serialNo: row.serialNo, kind: 'reissue' })}
            >
              补发
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const scanSamples = useMemo(() => {
    if (scan.kind === 'plan-qr') return [{ label: '示例计划 ID', value: PLANS[0].id }];
    if (scan.kind === 'yunyi')
      return [
        { label: '有效云驿码（蒙A90005）', value: yunyiSample() },
        { label: '过期云驿码', value: yunyiExpiredSample() },
      ];
    return [
      { label: '矿发卡 蒙A90005', value: mineCardSample('蒙A90005') },
      { label: '矿发卡 湘C92223（用于车牌不一致）', value: mineCardSample('湘C92223') },
    ];
  }, [scan.kind]);

  return (
    <ConfigProvider locale={zhCN}>
      <div className="mer-root">
        <header className="mer-head">
          <div>
            <h1>人工入厂登记</h1>
            <p>浅色后台登记台。预入厂后仍禁止入厂的车辆，须先允许入厂再确认登记。</p>
            <div className="mer-cfg">
              <Tag>{PLAN_MODE_LABEL[site.GET_PLAN_MSG]}</Tag>
              <Tag>{ORIGINAL_MODE_LABEL[site.GET_ORIGINAL_MSG]}</Tag>
              <Tag>{sampleRequired ? '采样过衡位必填' : '采样过衡位非必填'}</Tag>
              {site.ENABLE_ENTER_CARD ? <Tag color="blue">入厂卡</Tag> : null}
              {site.ENABLE_ENTER_SAMPLE_CARD ? <Tag color="blue">煤样卡</Tag> : null}
            </div>
          </div>
          <div className="mer-head-tools">
            <span style={{ color: 'rgba(0,0,0,.45)', fontSize: 13 }}>入厂点</span>
            <Select
              style={{ width: 168 }}
              value={siteId}
              options={SITES.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(id) => {
                setSiteId(id);
                form.resetFields();
                form.setFieldValue('sampleMethod', '机械采样');
                setLog('');
              }}
            />
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as RegisterMode)}
              options={[
                { label: '来煤登记', value: 'incoming' },
                { label: '转场煤登记', value: 'transfer' },
              ]}
            />
          </div>
        </header>

        <section className="mer-card">
          <div className="mer-card-hd">
            <h2>登记入厂信息{mode === 'transfer' ? ' · 转场煤' : ''}</h2>
            <div className="mer-card-actions">
              {(site.GET_PLAN_MSG === 1 || site.GET_PLAN_MSG === 2) && (
                <Button icon={<PlusSquareOutlined />} onClick={() => setPlanOpen(true)}>
                  选择计划
                </Button>
              )}
              {site.GET_PLAN_MSG === 2 && (
                <Button icon={<QrcodeOutlined />} loading={scanBusy === 'plan-qr'} onClick={() => openScan('plan-qr')}>
                  扫描计划二维码
                </Button>
              )}
              {(site.GET_PLAN_MSG === 4 || site.GET_ORIGINAL_MSG === 2) && (
                <Button icon={<CreditCardOutlined />} loading={scanBusy === 'mine-card'} onClick={() => openScan('mine-card')}>
                  读矿发卡
                </Button>
              )}
              {site.GET_ORIGINAL_MSG === 1 && (
                <Button icon={<IdcardOutlined />} onClick={loadPreEntryWeights}>
                  获取预入厂信息
                </Button>
              )}
              <Button icon={<ScanOutlined />} loading={scanBusy === 'yunyi'} onClick={() => openScan('yunyi')}>
                扫描云驿二维码
              </Button>
              <Button type="primary" ghost icon={<SafetyCertificateOutlined />} onClick={() => setAllowOpen(true)}>
                允许入厂
              </Button>
              {site.ENABLE_ENTER_SAMPLE_CARD && (
                <>
                  <Button icon={<SearchOutlined />} onClick={() => setQueryOpen(true)}>
                    煤样卡查询
                  </Button>
                  <Button onClick={() => setReissueOpen(true)}>补发煤样卡</Button>
                </>
              )}
            </div>
          </div>

          {livePre?.permit === 'forbidden' ? (
            <Alert
              type="error"
              showIcon
              banner
              message={`${livePre.plate} 预入厂后仍为禁止入厂登记，请先点「允许入厂」更新许可。`}
            />
          ) : null}
          {livePre?.permit === 'allowed' ? (
            <Alert type="success" showIcon banner message={`${livePre.plate} 已允许入厂登记`} />
          ) : null}

          <Form
            form={form}
            layout="vertical"
            initialValues={{ sampleMethod: '机械采样', gross: 0, tare: 0 }}
            className="mer-card-bd"
          >
            <Form.Item name="planId" hidden>
              <Input />
            </Form.Item>
            <div className="mer-form-grid">
              <div>
                <p className="mer-col-title">来煤信息</p>
                <Form.Item
                  label="车牌号码"
                  name="plate"
                  rules={[{ required: true, message: '请输入车牌号码' }]}
                >
                  <Input
                    placeholder="请输入或扫码回填"
                    onBlur={handlePlateMatch}
                    onPressEnter={handlePlateMatch}
                  />
                </Form.Item>
                <Form.Item label="供应商" name="supplier">
                  <Input placeholder="计划回显，可改" />
                </Form.Item>
                <Form.Item label="矿点" name="mine">
                  <Input placeholder="计划回显，可改" />
                </Form.Item>
                <Form.Item label="煤种" name="coalType">
                  <Input placeholder="计划回显，可改" />
                </Form.Item>
                <Form.Item label="运输单位" name="transporter">
                  <Select
                    showSearch
                    allowClear
                    placeholder="下拉单选，可模糊匹配"
                    options={TRANSPORTERS.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>
                <Form.Item label="品名" name="productName">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <p className="mer-col-title">矿发信息</p>
                <Form.Item label="车辆卡号" name="vehicleCard">
                  <Input />
                </Form.Item>
                <Form.Item label="矿发毛重 (t)" name="gross" rules={weightRule}>
                  <InputNumber style={{ width: '100%' }} min={0} max={199.999} step={0.1} />
                </Form.Item>
                <Form.Item label="矿发皮重 (t)" name="tare" rules={weightRule}>
                  <InputNumber style={{ width: '100%' }} min={0} max={199.999} step={0.1} />
                </Form.Item>
                <Form.Item
                  label="矿发净重 (t)"
                  name="net"
                  rules={[{ required: true, message: '请输入矿发净重' }, ...weightRule]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={199.999} step={0.1} placeholder="请输入矿发净重(t)" />
                </Form.Item>
                <Form.Item
                  label="发站时间"
                  name="shipTime"
                  rules={[{ required: true, message: '请选择发站时间' }]}
                >
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="发站" name="station">
                  <Input />
                </Form.Item>
              </div>
              <div>
                <p className="mer-col-title">入厂信息</p>
                <Form.Item
                  label="采样方式"
                  name="sampleMethod"
                  rules={[{ required: true, message: '请选择采样方式' }]}
                >
                  <Select options={SAMPLE_METHODS.map((t) => ({ value: t, label: t }))} />
                </Form.Item>
                <Form.Item
                  label="采样位"
                  name="samplePos"
                  rules={sampleRequired ? [{ required: true, message: '请选择采样位' }] : []}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="下拉单选，可模糊匹配"
                    options={SAMPLE_POSITIONS.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>
                <Form.Item
                  label="过衡位"
                  name="weighPos"
                  rules={sampleRequired ? [{ required: true, message: '请选择过衡位' }] : []}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="下拉单选，可模糊匹配"
                    options={WEIGH_POSITIONS.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>
                <Form.Item
                  label="卸煤区域"
                  name="unloadArea"
                  rules={[{ required: true, message: '请选择卸煤区域' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="下拉单选，可模糊匹配"
                    options={UNLOAD_AREAS.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>
                {site.ENABLE_ENTER_CARD ? (
                  <Form.Item
                    label="入厂卡"
                    name="entryCard"
                    rules={[{ required: true, message: '请填写入厂卡号' }]}
                    extra="卡号优先级：临时卡 ＞ 固定卡 ＞ 无卡号。后端推送临时卡时自动回填。"
                  >
                    <Input placeholder="YCOneTimeCardContent / 固定卡" />
                  </Form.Item>
                ) : null}
              </div>
            </div>
          </Form>

          {log ? <pre className="mer-log">{log}</pre> : null}

          <div className="mer-footer-actions">
            <Button
              type="primary"
              onClick={() => submit(false)}
            >
              确认登记
            </Button>
            {site.ENABLE_ENTER_SAMPLE_CARD ? (
              <Button type="primary" onClick={() => submit(true)}>
                确认登记并发煤样卡
              </Button>
            ) : null}
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                form.resetFields();
                form.setFieldValue('sampleMethod', '机械采样');
                setLog('');
              }}
            >
              清空
            </Button>
          </div>
        </section>

        <section className="mer-card">
          <div className="mer-card-hd">
            <h2>入厂登记记录</h2>
          </div>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredRecords}
            pagination={{ pageSize: 8, showTotal: (n) => `共 ${n} 条` }}
            scroll={{ x: 1480 }}
          />
        </section>

        <PlanSelectModal open={planOpen} onClose={() => setPlanOpen(false)} onPick={handlePlanPick} />
        <AllowEntryDrawer
          open={allowOpen}
          vehicles={vehicles}
          onClose={() => setAllowOpen(false)}
          onAllow={handleAllow}
          onFill={fillFromPlate}
        />
        <ScanModal
          open={scan.open}
          kind={scan.kind}
          loading={scan.loading}
          samples={scanSamples}
          onClose={() => setScan((s) => ({ ...s, open: false }))}
          onSubmit={handleScan}
        />
        <SampleCardWriteModal
          open={write.open}
          plate={write.plate}
          serialNo={write.serialNo}
          kind={write.kind}
          onClose={() => setWrite((w) => ({ ...w, open: false }))}
          onWritten={(c) => {
            setCardLogs((list) => [c, ...list]);
            setRecords((list) =>
              list.map((r) => (r.serialNo === c.serialNo ? { ...r, status: 'card-issued' } : r)),
            );
          }}
        />
        <SampleCardQueryDrawer open={queryOpen} logs={cardLogs} onClose={() => setQueryOpen(false)} />
        <ReissuePickModal
          open={reissueOpen}
          records={filteredRecords}
          onClose={() => setReissueOpen(false)}
          onPick={(row) => {
            setReissueOpen(false);
            setWrite({ open: true, plate: row.plate, serialNo: row.serialNo, kind: 'reissue' });
          }}
        />
        <Drawer title="登记详情" open={!!view} onClose={() => setView(null)} width={420}>
          {view ? (
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="流水号">{view.serialNo}</Descriptions.Item>
              <Descriptions.Item label="车牌">{view.plate}</Descriptions.Item>
              <Descriptions.Item label="供应商">{view.supplier}</Descriptions.Item>
              <Descriptions.Item label="矿点">{view.mine}</Descriptions.Item>
              <Descriptions.Item label="煤种">{view.coalType}</Descriptions.Item>
              <Descriptions.Item label="净重 t">{view.net}</Descriptions.Item>
              <Descriptions.Item label="采样 / 过衡">
                {view.samplePos} / {view.weighPos}
              </Descriptions.Item>
              <Descriptions.Item label="入厂卡">{view.entryCard || '—'}</Descriptions.Item>
              <Descriptions.Item label="时间">{view.enterAt}</Descriptions.Item>
            </Descriptions>
          ) : null}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default ManualEntryRegistration;
