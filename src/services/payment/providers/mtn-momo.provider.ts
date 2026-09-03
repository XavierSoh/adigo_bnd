import { registerPaymentProvider } from '../payment-provider.registry';
import { MTNMoMoService } from '../mtn-momo.service';

registerPaymentProvider('mtn_momo', MTNMoMoService);
