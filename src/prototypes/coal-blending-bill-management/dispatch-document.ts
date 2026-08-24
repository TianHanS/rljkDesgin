export type CoalSourceType = 'yard' | 'port';

export interface DispatchBlendDetail {
  id: string;
  sourceType?: CoalSourceType;
  yard: string;
  zone: string;
  coalType: string;
  batchNo: string;
  calorific: number;
  volatile: number;
  sulfur: number;
  moisture: number;
  ash: number;
  units: string[];
  bunkers: string[];
}

export interface DispatchPlan {
  planNo: string;
  planDate: string;
  details: DispatchBlendDetail[];
}

export const getSourceType = (detail: DispatchBlendDetail): CoalSourceType => {
  if (detail.sourceType) return detail.sourceType;
  if (detail.yard === '在途' || detail.yard === '在港待卸煤') return 'port';
  return 'yard';
};

export const isYardDetail = (detail: DispatchBlendDetail) => getSourceType(detail) === 'yard';

export const filterYardDetails = (details: DispatchBlendDetail[]) =>
  details.filter(isYardDetail);

export interface DispatchPayload {
  planNo: string;
  planDate: string;
  yardDetails: DispatchBlendDetail[];
  excludedPortCount: number;
}

export const buildDispatchPayload = (plan: DispatchPlan): DispatchPayload => {
  const yardDetails = filterYardDetails(plan.details);
  return {
    planNo: plan.planNo,
    planDate: plan.planDate,
    yardDetails,
    excludedPortCount: plan.details.length - yardDetails.length,
  };
};

/** 原型模拟：向煤场管控一体化下发煤场取煤明细 */
export const dispatchToYardControl = (plan: DispatchPlan) => {
  const payload = buildDispatchPayload(plan);
  if (payload.yardDetails.length === 0) {
    return { ok: false as const, reason: '无煤场取煤明细可下发' };
  }
  return { ok: true as const, payload };
};
