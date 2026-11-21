export const getSubscription = async () => ({
  plan: 'FREE',
  commission: 5,
  links_limit: 100,
  links_used: 0
});
export const upgradePlan = async (_plan: string) => ({ success: true });
