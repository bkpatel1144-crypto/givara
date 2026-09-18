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
        <img src={logo} alt={BRAND_NAME} />
      </a>
      <nav className="site-nav" aria-label="Primary">
        <span className="nav-tag">Custom Ring Studio</span>
        <button type="button" className="bag-btn" onClick={onOpenCart} data-testid="open-cart">
          Bag
          {cartCount > 0 && <span className="bag-count">{cartCount}</span>}
        </button>
      </nav>
    </header>
  );
}
