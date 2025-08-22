import { UserProperty } from "../services/types";

/** --------------------------
 *  Util: dependencias de campos
 *  -------------------------- */
function shouldRenderProperty(prop: UserProperty, values: Record<string, any>) {
  if (
    prop.dependency &&
    prop.dependency.fieldName &&
    Array.isArray(prop.dependency.triggerValues) &&
    prop.dependency.triggerValues.length > 0
  ) {
    const depValue = values[prop.dependency.fieldName];
    return prop.dependency.triggerValues.includes(depValue);
  }
  return true;
}

export default shouldRenderProperty