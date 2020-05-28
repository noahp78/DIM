import React, { useMemo } from 'react';
import { DimPlug, DimItem } from '../../inventory/item-types';
import LoadoutBuilderItem from '../LoadoutBuilderItem';
import { LockedItemType, LockedArmor2Mod } from '../types';
import ItemSockets from 'app/item-popup/ItemSockets';
import _ from 'lodash';
import styles from './GeneratedSetItem.m.scss';
import { AppIcon, faRandom, lockIcon } from 'app/shell/icons';
import { showItemPicker } from 'app/item-picker/item-picker';
import { t } from 'app/i18next-t';
import { lockedItemsEqual } from './utils';
import { generateMixesFromPerks, matchLockedItem } from '../process';
import { SocketDetailsMod } from 'app/item-popup/SocketDetails';
import { D2ManifestDefinitions } from 'app/destiny2/d2-definitions';
import './GeneratedSetItemLockedMods.scss';
import { DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';

/**
 * Figure out which (if any) non-selected perks should be selected to get the chosen stat mix.
 */
function identifyAltPerkChoicesForChosenStats(item: DimItem, chosenValues: number[]) {
  let altPerks: DimPlug[] = [];
  generateMixesFromPerks(item, {}, (mix, plugs) => {
    if (plugs && mix.every((val, index) => val === chosenValues[index])) {
      altPerks = plugs;
      return false;
    }
    return true;
  });
  return altPerks;
}
/**
 * An individual item in a generated set. Includes a perk display and a button for selecting
 * alternative items with the same stat mix.
 */
export default function GeneratedSetItem({
  item,
  locked,
  defs,
  statValues,
  itemOptions,
  lockedMods,
  addLockedItem,
  removeLockedItem,
}: {
  item: DimItem;
  locked?: readonly LockedItemType[];
  defs: D2ManifestDefinitions;
  statValues: number[];
  itemOptions: DimItem[];
  lockedMods?: LockedArmor2Mod[];
  addLockedItem(lockedItem: LockedItemType): void;
  removeLockedItem(lockedItem: LockedItemType): void;
}) {
  const altPerks = useMemo(() => identifyAltPerkChoicesForChosenStats(item, statValues), [
    item,
    statValues,
  ]);

  const classesByHash = altPerks.reduce(
    (memo, perk) => ({ ...memo, [perk.plugItem.hash]: styles.altPerk }),
    {}
  );
  if (locked) {
    for (const lockedItem of locked) {
      if (lockedItem.type === 'perk') {
        classesByHash[lockedItem.perk.hash] = styles.selectedPerk;
      }
    }
  }

  const chooseReplacement = async () => {
    const ids = new Set(itemOptions.map((i) => i.id));

    try {
      const { item } = await showItemPicker({
        prompt: t('LoadoutBuilder.ChooseAlternate'),
        hideStoreEquip: true,
        filterItems: (item: DimItem) => ids.has(item.id),
      });

      addLockedItem({ type: 'item', item, bucket: item.bucket });
    } catch (e) {}
  };

  const onShiftClick = (lockedItem: LockedItemType) => {
    locked?.some((li) => lockedItemsEqual(lockedItem, li))
      ? removeLockedItem(lockedItem)
      : addLockedItem(lockedItem);
  };

  const lockedPerksAndOldMods: DestinyInventoryItemDefinition[] = [];

  if ($featureFlags.armor2ModPicker && locked?.length) {
    for (const lockedItem of locked) {
      if (lockedItem.type === 'perk' && matchLockedItem(item, lockedItem)) {
        lockedPerksAndOldMods.push(lockedItem.perk);
      } else if (lockedItem.type === 'mod' && matchLockedItem(item, lockedItem)) {
        lockedPerksAndOldMods.push(lockedItem.mod);
      }
    }
  }

  return (
    <div className={styles.item}>
      <LoadoutBuilderItem item={item} locked={locked} addLockedItem={addLockedItem} />

      {itemOptions.length > 1 ? (
        <button
          className={styles.swapButton}
          title={t('LoadoutBuilder.ChooseAlternateTitle')}
          onClick={chooseReplacement}
        >
          <AppIcon icon={faRandom} />
        </button>
      ) : (
        locked?.some((li) => li.type === 'item') && (
          <button
            className={styles.swapButton}
            title={t('LoadoutBuilder.UnlockItem')}
            onClick={() => removeLockedItem({ type: 'item', item, bucket: item.bucket })}
          >
            <AppIcon icon={lockIcon} />
          </button>
        )
      )}
      {!$featureFlags.armor2ModPicker && item.isDestiny2() && (
        <ItemSockets
          item={item}
          minimal={true}
          classesByHash={classesByHash}
          onShiftClick={onShiftClick}
        />
      )}
      {$featureFlags.armor2ModPicker && (
        <div className={styles.lockedSockets}>
          {lockedMods?.length && (
            <div className={`lockedMods ${styles.lockedSocketsRow}`}>
              {lockedMods?.map((mod) => (
                <SocketDetailsMod key={mod.mod.hash} itemDef={mod.mod} defs={defs} />
              ))}
            </div>
          )}
          <div className={`lockedMods ${styles.lockedSocketsRow}`}>
            {lockedPerksAndOldMods?.map((def) => (
              <SocketDetailsMod key={def.hash} itemDef={def} defs={defs} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
