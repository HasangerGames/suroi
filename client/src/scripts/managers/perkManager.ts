import { Perks, type PerkDefinition } from "@common/definitions/items/perks";
import { removeFrom } from "@common/utils/misc";
import type { ReferenceTo, ReifiableDef } from "@common/utils/objectDefinitions";

class PerkManagerClass {
    perks: PerkDefinition[] = [];

    add(perk: ReifiableDef<PerkDefinition>): void {
        const perkDef = Perks.reify(perk);
        if (this.perks.includes(perkDef)) return;

        this.perks.push(perkDef);
    }

    has(perk: ReifiableDef<PerkDefinition>): boolean {
        return this.perks.includes(Perks.reify(perk));
    }

    remove(perk: ReifiableDef<PerkDefinition>): void {
        const perkDef = Perks.reify(perk);
        if (!this.perks.includes(perkDef)) return;

        removeFrom(this.perks, perkDef);
    }

    map<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        const def = Perks.reify(perk);
        if (this.perks.includes(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }
    }

    mapOrDefault<Name extends ReferenceTo<PerkDefinition>, U>(
        perk: Name | (PerkDefinition & { readonly idString: Name }),
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        const def = Perks.reify(perk);
        if (this.perks.includes(def)) {
            return mapper(def as PerkDefinition & { readonly idString: Name });
        }

        return defaultValue;
    }
}

export const PerkManager = new PerkManagerClass();
