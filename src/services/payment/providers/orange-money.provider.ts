import { registerPaymentProvider } from '../payment-provider.registry';
import { OrangeMoneyService } from '../orange-money.service';

registerPaymentProvider('orange_money', OrangeMoneyService);
