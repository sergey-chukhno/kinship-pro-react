import React, { useState } from 'react';
import './SubscriptionManagement.css';

const SubscriptionManagement: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState('premium');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'basic',
      name: 'Plan Basique',
      price: { monthly: 29, yearly: 290 },
      features: [
        'Jusqu\'à 50 membres',
        'Gestion des projets',
        'Support email',
        'Stockage 5GB'
      ],
      limitations: [
        'Pas de gestion des badges',
        'Pas d\'analytics avancés',
        'Pas de support prioritaire'
      ]
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      price: { monthly: 59, yearly: 590 },
      features: [
        'Jusqu\'à 200 membres',
        'Gestion complète des projets',
        'Système de badges',
        'Analytics avancés',
        'Support prioritaire',
        'Stockage 50GB'
      ],
      limitations: []
    },
    {
      id: 'enterprise',
      name: 'Plan Entreprise',
      price: { monthly: 99, yearly: 990 },
      features: [
        'Membres illimités',
        'Toutes les fonctionnalités',
        'API personnalisée',
        'Support dédié',
        'Stockage illimité',
        'Intégrations avancées'
      ],
      limitations: []
    }
  ];

  const currentPlanData = plans.find(plan => plan.id === currentPlan);

  const handlePlanChange = (planId: string) => {
    setCurrentPlan(planId);
  };

  const handleBillingChange = (cycle: string) => {
    setBillingCycle(cycle);
  };

  const handleUpgrade = () => {
    // TODO: Implement plan upgrade
    console.log('Upgrade plan');
  };

  const handleDowngrade = () => {
    // TODO: Implement plan downgrade
    console.log('Downgrade plan');
  };

  const handleCancel = () => {
    // TODO: Implement subscription cancellation
    console.log('Cancel subscription');
  };

  return (
    <div className="subscription-management">
      <div className="section-header">
        <h2>Gestion des abonnements</h2>
        <div className="billing-toggle">
          <button 
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => handleBillingChange('monthly')}
          >
            Mensuel
          </button>
          <button 
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => handleBillingChange('yearly')}
          >
            Annuel (-17%)
          </button>
        </div>
      </div>

      {/* Current Plan */}
      <div className="current-plan">
        <h3>Plan actuel</h3>
        <div className="plan-card current">
          <div className="plan-header">
            <h4>{currentPlanData?.name}</h4>
            <div className="plan-price">
              <span className="price">
                {billingCycle === 'monthly' ? currentPlanData?.price.monthly : currentPlanData?.price.yearly}€
              </span>
              <span className="period">
                /{billingCycle === 'monthly' ? 'mois' : 'an'}
              </span>
            </div>
          </div>
          <div className="plan-features">
            {currentPlanData?.features.map((feature, index) => (
              <div key={index} className="feature-item">
                <i className="fas fa-check"></i>
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <div className="plan-actions">
            <button className="btn btn-outline" onClick={handleDowngrade}>
              Changer de plan
            </button>
            <button className="btn btn-danger" onClick={handleCancel}>
              Annuler l'abonnement
            </button>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="available-plans">
        <h3>Plans disponibles</h3>
        <div className="plans-grid">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.id === currentPlan ? 'current' : ''}`}
            >
              <div className="plan-header">
                <h4>{plan.name}</h4>
                <div className="plan-price">
                  <span className="price">
                    {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}€
                  </span>
                  <span className="period">
                    /{billingCycle === 'monthly' ? 'mois' : 'an'}
                  </span>
                </div>
              </div>
              <div className="plan-features">
                {plan.features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <i className="fas fa-check"></i>
                    <span>{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, index) => (
                  <div key={index} className="feature-item limitation">
                    <i className="fas fa-times"></i>
                    <span>{limitation}</span>
                  </div>
                ))}
              </div>
              <div className="plan-actions">
                {plan.id === currentPlan ? (
                  <button className="btn btn-primary" disabled>
                    Plan actuel
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handlePlanChange(plan.id)}
                  >
                    {plan.id === 'enterprise' ? 'Contacter les ventes' : 'Changer de plan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Information */}
      <div className="billing-info">
        <h3>Informations de facturation</h3>
        <div className="billing-card">
          <div className="billing-details">
            <div className="billing-item">
              <span className="label">Prochaine facturation:</span>
              <span className="value">15 Février 2024</span>
            </div>
            <div className="billing-item">
              <span className="label">Montant:</span>
              <span className="value">
                {billingCycle === 'monthly' ? currentPlanData?.price.monthly : currentPlanData?.price.yearly}€
              </span>
            </div>
            <div className="billing-item">
              <span className="label">Méthode de paiement:</span>
              <span className="value">**** **** **** 1234</span>
            </div>
          </div>
          <div className="billing-actions">
            <button className="btn btn-outline">
              <i className="fas fa-download"></i> Télécharger la facture
            </button>
            <button className="btn btn-outline">
              <i className="fas fa-credit-card"></i> Modifier le paiement
            </button>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="usage-stats">
        <h3>Utilisation actuelle</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h4>Membres</h4>
              <div className="stat-value">45 / 200</div>
              <div className="stat-bar">
                <div className="stat-fill" style={{ width: '22.5%' }}></div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-hdd"></i>
            </div>
            <div className="stat-content">
              <h4>Stockage</h4>
              <div className="stat-value">12.5 GB / 50 GB</div>
              <div className="stat-bar">
                <div className="stat-fill" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-project-diagram"></i>
            </div>
            <div className="stat-content">
              <h4>Projets</h4>
              <div className="stat-value">8 actifs</div>
              <div className="stat-bar">
                <div className="stat-fill" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
