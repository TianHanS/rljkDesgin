/**
 * @name 燃煤入厂登记
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - 用户提供的人工入厂登记截图与功能需求
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Descriptions,
  Drawer,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  ClearOutlined,
  CreditCardOutlined,
  IdcardOutlined,
  PlusSquareOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
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
  SAMPLE_POSITIONS,
  SITES,
  WEIGH_POSITIONS,
  findPlan,
  findPlanByPlate,
  findPreEntry,
  mineCardSample,
  nextSerial,
  type CoalPlan,
  type EntryRecord,
  type PreEntryVehicle,
  type SiteConfig,
} from './data';
import { applyPlan, isYunyiFresh, parseMineCard, parseYunyi } from './parse';
import AllowEntryDrawer, { ALLOW_ENTRY_TOOLTIP } from './components/AllowEntryDrawer';
import PlanSelectModal from './components/PlanSelectModal';
import PlateInput from './components/PlateInput';
import ScanModal, { type ScanKind } from './components/ScanModal';
import UnderlineField from './components/UnderlineField';
import YunyiScanModal from './components/YunyiScanModal';

interface FormValues {
  plate?: string;
  supplier?: string;
  mine?: string;
  coalType?: string;
  transporter?: string;
  productName?: string;
  gross?: number | null;
  tare?: number | null;
  net?: number | null;
  shipTime?: Dayjs | null;
  station?: string;
  samplePos?: string;
  weighPos?: string;
  unloadArea?: string;
  sampleMethod?: string;
  planId?: string;
}

const emptyForm = (): FormValues => ({
  plate: undefined,
  supplier: undefined,
  mine: undefined,
  coalType: undefined,
  transporter: undefined,
  productName: undefined,
  gross: null,
  tare: null,
  net: null,
  shipTime: null,
  station: undefined,
  samplePos: undefined,
  weighPos: undefined,
  unloadArea: undefined,
  sampleMethod: '机械采样',
  planId: undefined,
});

const ManualEntryRegistration: React.FC = () => {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [siteId, setSiteId] = useState(SITES[0].id);
  const [vehicles, setVehicles] = useState<PreEntryVehicle[]>(() =>
    PRE_ENTRIES.map((v) => ({ ...v })),
  );
  const listBodyRef = useRef<HTMLDivElement>(null);
  const [tableY, setTableY] = useState(180);
  const [records, setRecords] = useState<EntryRecord[]>(INITIAL_RECORDS);
  const [planOpen, setPlanOpen] = useState(false);
  const [allowOpen, setAllowOpen] = useState(false);
  const [yunyiScanOpen, setYunyiScanOpen] = useState(false);
  const [scan, setScan] = useState<{ open: boolean; kind: ScanKind; loading: boolean }>({
    open: false,
    kind: 'plan-qr',
    loading: false,
  });
  const [view, setView] = useState<EntryRecord | null>(null);
  const [scanBusy, setScanBusy] = useState<ScanKind | null>(null);

  const site = SITES.find((s) => s.id === siteId) ?? SITES[0];
  const livePre = values.plate
    ? vehicles.find((v) => v.plate.replace(/\s/g, '') === values.plate!.replace(/\s/g, ''))
    : undefined;

  const patch = (next: Partial<FormValues>) => setValues((prev) => ({ ...prev, ...next }));

  const fillPlan = (plan: CoalPlan, withWeights: boolean) => {
    const base = applyPlan(plan);
    setValues((prev) => ({
      ...prev,
      ...base,
      shipTime: plan.shipTime ? dayjs(plan.shipTime) : null,
      sampleMethod: prev.sampleMethod || '机械采样',
      samplePos: prev.samplePos || SAMPLE_POSITIONS[0],
      weighPos: prev.weighPos || WEIGH_POSITIONS[0],
      ...(withWeights ? { gross: plan.gross, tare: plan.tare, net: plan.net } : {}),
    }));
  };

  const shouldFillWeights = (cfg: SiteConfig, from: 'plan' | 'pre' | 'card' | 'yunyi') => {
    if (cfg.GET_ORIGINAL_MSG === 1) return from === 'pre' || from === 'plan';
    if (cfg.GET_ORIGINAL_MSG === 2) return from === 'card' || from === 'plan';
    if (cfg.GET_ORIGINAL_MSG === 3) return from === 'plan' || from === 'pre';
    if (cfg.GET_ORIGINAL_MSG === 4) return from === 'yunyi' || from === 'plan';
    return false;
  };

  const openScan = (kind: ScanKind) => {
    if (kind === 'yunyi') {
      setScanBusy('yunyi');
      window.setTimeout(() => {
        setScanBusy(null);
        setYunyiScanOpen(true);
      }, 450);
      return;
    }
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

  const loadPreEntryWeights = () => {
    if (!values.plate?.trim()) {
      message.warning('请先输入或选择车牌号码');
      return;
    }
    const plate = values.plate.trim();
    const hit = vehicles.find((v) => v.plate === plate) ?? findPreEntry(plate);
    const plan = hit ? findPlan(hit.planId) : findPlanByPlate(plate);
    if (!plan) {
      message.warning('未查到预入厂 / 计划信息');
      return;
    }
    fillPlan(plan, true);
    message.success('已获取预入厂矿发信息');
  };

  const fillFromPlate = (plate: string) => {
    const hit = vehicles.find((v) => v.plate === plate) ?? findPreEntry(plate);
    const plan = hit ? findPlan(hit.planId) : findPlanByPlate(plate);
    if (plan) {
      const withWeights = shouldFillWeights(site, 'pre') || shouldFillWeights(site, 'plan');
      const base = applyPlan(plan);
      setValues((prev) => ({
        ...prev,
        ...base,
        plate,
        shipTime: plan.shipTime ? dayjs(plan.shipTime) : null,
        sampleMethod: prev.sampleMethod || '机械采样',
        samplePos: prev.samplePos || SAMPLE_POSITIONS[0],
        weighPos: prev.weighPos || WEIGH_POSITIONS[0],
        ...(withWeights ? { gross: plan.gross, tare: plan.tare, net: plan.net } : {}),
      }));
      message.success(`已加载 ${plate} 关联信息`);
    } else {
      patch({ plate });
    }
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
    const card = parseMineCard(raw);
    if (!card) {
      message.error('矿发卡内容无法解析');
      return;
    }
    const formPlate = (values.plate || '').trim();
    const applyCard = () => {
      const plan = findPlan(card.planId);
      if (!plan) {
        message.error('未查询到入厂计划信息');
        return;
      }
      const base = applyPlan(plan);
      setValues((prev) => ({
        ...prev,
        ...base,
        plate: formPlate || card.cardPlate,
        shipTime: plan.shipTime ? dayjs(plan.shipTime) : null,
        sampleMethod: prev.sampleMethod || '机械采样',
        samplePos: prev.samplePos || SAMPLE_POSITIONS[0],
        weighPos: prev.weighPos || WEIGH_POSITIONS[0],
        ...(shouldFillWeights(site, 'card')
          ? {
              gross: card.gross,
              tare: card.tare,
              net: Number((card.gross - card.tare).toFixed(3)),
            }
          : {}),
      }));
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

  const handleYunyiScan = (raw: string) => {
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
    const base = applyPlan(plan);
    setValues((prev) => ({
      ...prev,
      ...base,
      plate: parsed.plate,
      shipTime: parsed.stationTime ? dayjs(parsed.stationTime) : dayjs(plan.shipTime),
      sampleMethod: prev.sampleMethod || '机械采样',
      samplePos: prev.samplePos || SAMPLE_POSITIONS[0],
      weighPos: prev.weighPos || WEIGH_POSITIONS[0],
      ...(shouldFillWeights(site, 'yunyi')
        ? { gross: parsed.gross, tare: parsed.tare, net: parsed.net }
        : {}),
    }));
    message.success('云驿二维码已识别并加载车辆信息');
  };

  const handleAllowConfirm = (reason: string) => {
    const plate = values.plate?.trim();
    if (!plate) return;
    setVehicles((list) => list.map((v) => (v.plate === plate ? { ...v, permit: 'allowed' } : v)));
    setAllowOpen(false);
    message.success(`${plate} 已人工允许入厂（${reason}）`);
  };

  const submit = () => {
    const plate = values.plate?.trim();
    if (!plate) {
      message.error('请先输入车牌号码');
      return;
    }
    if (values.net == null || Number.isNaN(Number(values.net))) {
      message.error('缺少矿发净重，请先选择计划或扫码回填');
      return;
    }
    if (!values.shipTime) {
      message.error('缺少发站时间，请先选择计划或扫码回填');
      return;
    }
    if (!values.unloadArea) {
      message.error('缺少卸煤区域，请先选择计划或扫码回填');
      return;
    }
    if (site.SAMPLE_MEASURE_EDIT === 1 && (!values.samplePos || !values.weighPos)) {
      message.error('缺少采样位或过衡位');
      return;
    }
    const permit = vehicles.find((v) => v.plate === plate);
    if (permit?.permit === 'forbidden') {
      message.error('该车辆仍为禁止入厂，请先办理允许入厂');
      setAllowOpen(true);
      return;
    }
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
      status: 'registered',
      entryCard: '',
      siteId: site.id,
    };
    setRecords((list) => [row, ...list]);
    setValues(emptyForm());
    message.success(
      `登记成功。道闸已抬杆，LED「${plate} 登记成功」，广播「${plate} 请入厂，前往${values.samplePos || '采样位'} ${values.weighPos || '过衡位'}」`,
    );
  };

  const filteredRecords = records.filter((r) => r.siteId === site.id);

  useLayoutEffect(() => {
    const el = listBodyRef.current;
    if (!el) return;
    const sync = () => {
      const head = el.querySelector('.ant-table-thead') as HTMLElement | null;
      const headH = head?.offsetHeight ?? 39;
      setTableY(Math.max(120, el.clientHeight - headH - 2));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [filteredRecords.length, siteId]);

  const columns: ColumnsType<EntryRecord> = [
    { title: '序号', width: 56, render: (_, __, i) => i + 1 },
    { title: '流水号', dataIndex: 'serialNo', width: 150 },
    { title: '车牌号', dataIndex: 'plate', width: 100 },
    { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
    { title: '矿点', dataIndex: 'mine', width: 100 },
    { title: '煤种', dataIndex: 'coalType', width: 80 },
    { title: '采样方式', dataIndex: 'sampleMethod', width: 90 },
    { title: '矿发净重(t)', dataIndex: 'net', width: 100 },
    { title: '过衡位', dataIndex: 'weighPos', width: 100 },
    { title: '采样位', dataIndex: 'samplePos', width: 120 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: () => <Tag>已登记</Tag>,
    },
    {
      title: '操作',
      width: 72,
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => setView(row)}>
          查看
        </Button>
      ),
    },
  ];

  const scanSamples = useMemo(() => {
    if (scan.kind === 'plan-qr') return [{ label: '示例计划 ID', value: PLANS[0].id }];
    return [
      { label: '矿发卡 蒙A90005', value: mineCardSample('蒙A90005') },
      { label: '矿发卡 湘C92223（用于车牌不一致）', value: mineCardSample('湘C92223') },
    ];
  }, [scan.kind]);

  const weightText = (n?: number | null) =>
    n === undefined || n === null || Number.isNaN(Number(n)) ? undefined : `${Number(n)} t`;

  const permitNode = () => {
    if (!values.plate?.trim() || !livePre) return undefined;
    if (livePre.permit === 'allowed') return <Tag color="success">是</Tag>;
    return <Tag color="error">否</Tag>;
  };

  const allowDisabled = !values.plate?.trim() || livePre?.permit !== 'forbidden';

  return (
    <ConfigProvider locale={zhCN} componentSize="small">
      <div className="mer-root">
        <header className="mer-head">
          <h1>燃煤入厂登记</h1>
          <div className="mer-head-tools">
            <Tag>{PLAN_MODE_LABEL[site.GET_PLAN_MSG]}</Tag>
            <Tag>{ORIGINAL_MODE_LABEL[site.GET_ORIGINAL_MSG]}</Tag>
            <span style={{ color: 'rgba(0,0,0,.45)' }}>入厂点</span>
            <Select
              style={{ width: 148 }}
              value={siteId}
              options={SITES.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(id) => {
                setSiteId(id);
                setValues(emptyForm());
              }}
            />
          </div>
        </header>

        <section className="mer-card mer-form-card">
          <div className="mer-card-hd">
            <h2>登记入厂信息</h2>
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
            </div>
          </div>

          <div className="mer-card-bd">
            <div className="mer-form-grid">
              <div>
                <p className="mer-col-title">来煤信息</p>
                <PlateInput
                  value={values.plate}
                  onChange={(plate) => patch({ plate })}
                  onSelect={fillFromPlate}
                />
                <UnderlineField label="供应商" value={values.supplier} />
                <UnderlineField label="矿点" value={values.mine} />
                <UnderlineField label="煤种" value={values.coalType} />
                <UnderlineField label="运输单位" value={values.transporter} />
                <UnderlineField label="品名" value={values.productName} />
              </div>
              <div>
                <p className="mer-col-title">矿发信息</p>
                <UnderlineField label="矿发毛重" value={weightText(values.gross)} />
                <UnderlineField label="矿发皮重" value={weightText(values.tare)} />
                <UnderlineField label="矿发净重" value={weightText(values.net)} required />
                <UnderlineField
                  label="发站时间"
                  value={values.shipTime ? values.shipTime.format('YYYY-MM-DD HH:mm:ss') : undefined}
                  required
                />
                <UnderlineField label="发站" value={values.station} />
              </div>
              <div>
                <p className="mer-col-title">入厂信息</p>
                <UnderlineField label="采样方式" value={values.sampleMethod} required />
                <UnderlineField label="采样位" value={values.samplePos} required={site.SAMPLE_MEASURE_EDIT === 1} />
                <UnderlineField label="过衡位" value={values.weighPos} required={site.SAMPLE_MEASURE_EDIT === 1} />
                <UnderlineField label="卸煤区域" value={values.unloadArea} required />
                <div className="mer-ufield">
                  <span className="mer-ufield-label">允许入厂</span>
                  <span className="mer-ufield-value mer-ufield-permit">
                    {permitNode() ?? <span className="is-empty">—</span>}
                    <Tooltip title={ALLOW_ENTRY_TOOLTIP}>
                      <QuestionCircleOutlined className="mer-permit-help" aria-label="允许入厂说明" />
                    </Tooltip>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mer-footer-actions">
            <Space>
              <Button type="primary" onClick={submit}>
                确认登记
              </Button>
              <Button disabled={allowDisabled} onClick={() => setAllowOpen(true)}>
                允许入厂
              </Button>
              <Button icon={<ClearOutlined />} onClick={() => setValues(emptyForm())}>
                清空
              </Button>
            </Space>
          </div>
        </section>

        <section className="mer-card mer-list-card">
          <div className="mer-card-hd">
            <h2>入厂登记记录</h2>
            <span className="mer-list-count">共 {filteredRecords.length} 条</span>
          </div>
          <div className="mer-list-body" ref={listBodyRef}>
            <Table
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={filteredRecords}
              pagination={false}
              scroll={{ x: 1280, y: tableY }}
            />
          </div>
        </section>

        <PlanSelectModal open={planOpen} onClose={() => setPlanOpen(false)} onPick={handlePlanPick} />
        <AllowEntryDrawer
          open={allowOpen}
          plate={values.plate}
          supplier={values.supplier}
          gross={values.gross}
          tare={values.tare}
          net={values.net}
          permit={livePre?.permit}
          onClose={() => setAllowOpen(false)}
          onConfirm={handleAllowConfirm}
        />
        <YunyiScanModal
          open={yunyiScanOpen}
          onClose={() => setYunyiScanOpen(false)}
          onSuccess={handleYunyiScan}
        />
        <ScanModal
          open={scan.open}
          kind={scan.kind}
          loading={scan.loading}
          samples={scanSamples}
          onClose={() => setScan((s) => ({ ...s, open: false }))}
          onSubmit={handleScan}
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
              <Descriptions.Item label="时间">{view.enterAt}</Descriptions.Item>
            </Descriptions>
          ) : null}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default ManualEntryRegistration;
