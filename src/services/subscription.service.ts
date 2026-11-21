import { getCurrentPlan, upgradePlan as upgradePlanApi } from './plans.service';

export const getSubscription = async () => getCurrentPlan();
export const upgradePlan = async (plan: string) => upgradePlanApi(plan);
