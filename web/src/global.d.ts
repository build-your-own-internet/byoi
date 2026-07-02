// ponytail: lasertag CSS module type
declare module '*.module.css' {
  const css: { class: string };
  export default css;
}

// Runtime OIDC config written post-publish (see by-9td.8)
interface Window {
  __BYOI_CONFIG__?: import('./lib/auth-client').ByoiConfig;
}
