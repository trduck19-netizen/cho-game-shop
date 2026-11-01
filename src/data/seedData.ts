import type { StoreProduct, GiveawayCampaign, UtilityProduct } from '../types/game';
import type { InventoryItem } from '../admin/types/adminTypes';
import storeProductsData from './storeProducts.json';
import utilitiesData from './utilities.json';
import giveawaysData from './giveaways.json';

/**
 * Default Seed Collections:
 * Guaranteed catalog baselines for Store Products, Utilities, and Giveaways.
 * Ensures that even on fresh install or temporary network disconnects,
 * the web store displays the canonical product baseline.
 */
export const DEFAULT_STORE_PRODUCTS: StoreProduct[] = storeProductsData as unknown as StoreProduct[];
export const DEFAULT_GIVEAWAYS: GiveawayCampaign[] = giveawaysData as unknown as GiveawayCampaign[];
export const DEFAULT_INVENTORY: InventoryItem[] = [];
export const DEFAULT_UTILITY_PRODUCTS: UtilityProduct[] = utilitiesData as unknown as UtilityProduct[];
