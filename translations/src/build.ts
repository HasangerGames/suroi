import { buildTranslations, validateTranslations } from "./processTranslations";

validateTranslations().then(buildTranslations)
