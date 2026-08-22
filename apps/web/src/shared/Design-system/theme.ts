import { animations } from "./animations";
import { breakpoints } from "./breakpoints";
import { colors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  animations,
  breakpoints,
} as const;