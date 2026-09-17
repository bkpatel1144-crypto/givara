import logo from "@/assets/givara-logo.png";
import { BRAND_NAME } from "@/data/ringOptions";

export function SiteHeader({
  cartCount,
  onOpenCart,
}: {
  cartCount: number;
  onOpenCart: () => void;
}) {
  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label={`${BRAND_NAME} home`}>
        <img src={logo} alt={`${BRAND_NAME} logo`} width={148} height={40} />
      </a>
      <nav className="site-nav" aria-label="Primary">
        <span className="nav-tag">Custom Ring Studio</span>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onOpenCart}
          data-testid="open-cart"
        >
          Bag{cartCount > 0 ? ` (${cartCount})` : ""}
        </button>
      </nav>
    </header>
  );
}
