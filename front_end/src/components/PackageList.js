// src/components/PackageList.js
import React from 'react';

const PackageList = ({ packages, onPackageClick }) => {
  return (
    <div>
      <h2>Available Packages</h2>
      <ul>
        {packages.map((pkg) => (
          <li key={pkg.id} onClick={() => onPackageClick(pkg.id)}>
            <strong>{pkg.name}</strong> - {pkg.version}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PackageList;
