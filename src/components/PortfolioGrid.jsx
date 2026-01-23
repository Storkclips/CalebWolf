import { Link } from 'react-router-dom';
import { portfolioItems } from '../data';

const PortfolioGrid = () => (
  <section className="section">
    <div className="section-head">
      <div>
        <p className="eyebrow">Portfolio</p>
        <h2>Recent frames</h2>
        <p className="muted">A glimpse into how each story was framed and lit.</p>
      </div>
      <Link className="ghost" to="/contact">
        Plan your session
      </Link>
    </div>
    <div className="grid portfolio-grid">
      {portfolioItems.map((item) => (
        <article className="card" key={item.title}>
          <div className="card-image" style={{ backgroundImage: `url(${item.image})` }} />
          <div className="card-body">
            <p className="tag">{item.category}</p>
            <h3>{item.title}</h3>
            <p className="muted">Crafted with directional light and thoughtful prompts.</p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default PortfolioGrid;
