import "./style.css";
import { mount } from "./web/app.ts";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) mount(root);
