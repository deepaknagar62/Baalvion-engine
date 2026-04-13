export interface ITenant {
  id: string;
  slug: string;
  domain: string;
  name: string;
  isActive: boolean;
  config: ITenantConfig;
  createdAt: Date;
}

export interface ITenantConfig {
  features: string[];
  plan: 'free' | 'pro' | 'enterprise';
  theme: string;
  notificationChannels: string[];
  maxUsersPerTenant: number;
  customDomains: string[];
}
