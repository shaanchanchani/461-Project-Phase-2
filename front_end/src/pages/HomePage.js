// src/pages/HomePage.js
import React, { useState } from 'react';
import PackageList from '../components/PackageList';
import PackageDetails from '../components/PackageDetails';

// Sample hard-coded data
const samplePackages = [
  { id: 1, name: 'example-package', version: '1.0.0', description: 'A mock package' },
  { id: 2, name: 'another-package', version: '2.1.0', description: 'Another mock package' },
];

const packageDetailsData = {
  1: {
    id: 1,
    name: 'example-package',
    version: '1.0.0',
    description: 'A mock package with additional details.',
    dependencies: ['dep1', 'dep2'],
    ratings: {
      overall: 4.5,
      quality: 4.0,
      performance: 5.0,
    },
  },
  2: {
    id: 2,
    name: 'another-package',
    version: '2.1.0',
    description: 'Another package with detailed info.',
    dependencies: [],
    ratings: {
      overall: 3.8,
      quality: 4.0,
      performance: 3.5,
    },
  },
};

const HomePage = () => {
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  const handlePackageClick = (id) => {
    setSelectedPackageId(id);
  };

  const selectedPackage = selectedPackageId ? packageDetailsData[selectedPackageId] : null;

  return (
    <div>
      <PackageList packages={samplePackages} onPackageClick={handlePackageClick} />
      <PackageDetails packageDetail={selectedPackage} />
    </div>
  );
};

export default HomePage;
