// Central economy tuning surface. Values represent average credits per player.
export const ECONOMY_MODEL={
  version:'economy-v1',startCredits:800,overtimeCredits:5000,creditCap:9000,
  income:{win:3000,loss:[1900,2400,2900],plant:300},
  buy:{pistol:0,eco:500,force:2200,full:3900},
  thresholds:{full:3900,force:2000,forceChance:0.45}
};
