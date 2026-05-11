import { clientService } from './services/clientService.ts';
import { contractService } from './services/contractService.ts';
import { dealService } from './services/dealService.ts';
import { commercialService } from './services/commercialService.ts';
import { crmService } from './services/crmService.ts';

const clientId = 'c7e8e97f-9467-4a0b-93ff-eb80c85b59ea';

async function test() {
  try { await clientService.getCampaigns(clientId, '2026-04-11', '2026-05-11'); console.log('getCampaigns ok'); } catch(e: any) { console.log('getCampaigns err', e.message); }
  try { await clientService.getClientPlatformMetrics(clientId, '2026-04-11', '2026-05-11'); console.log('getClientPlatformMetrics ok'); } catch(e: any) { console.log('getClientPlatformMetrics err', e.message); }
  try { await contractService.getClientContract(clientId); console.log('getClientContract ok'); } catch(e: any) { console.log('getClientContract err', e.message); }
  try { await dealService.getDeals(clientId); console.log('getDeals ok'); } catch(e: any) { console.log('getDeals err', e.message); }
  try { await commercialService.getActivities(clientId); console.log('getActivities ok'); } catch(e: any) { console.log('getActivities err', e.message); }
  try { await crmService.getContacts(clientId); console.log('getContacts ok'); } catch(e: any) { console.log('getContacts err', e.message); }
  process.exit(0);
}
test();
