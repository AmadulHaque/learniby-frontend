import { serve } from "srvx/node";
import path from "node:path";

serve({
  static: path.resolve("dist"),
  port: process.env.PORT || 3000,
});
