// @ts-expect-error kenis
import language from "../languages/english"
import { stringify } from "hjson"
import { writeFileSync } from "fs"

writeFileSync("../languages/vi.hjson", stringify(language, {
  quotes: "all"
}))
