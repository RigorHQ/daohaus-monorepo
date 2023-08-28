import { TokenDeployed } from '../generated/TokenSummoner/TokenSummoner';

import { OldTokenTemplate } from '../generated/templates';
import { OldToken } from '../generated/schema';

export function handleTokenDeployed(event: TokenDeployed): void {
  OldTokenTemplate.create(event.params.token);

  const oldToken = new OldToken(event.params.token.toHexString());

  oldToken.holders = new Array<string>();
  oldToken.balances = new Array<string>();

  oldToken.save();
}
