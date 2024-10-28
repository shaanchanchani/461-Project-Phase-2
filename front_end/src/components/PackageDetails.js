// src/components/PackageDetails.js
import React from 'react';

const PackageDetails = ({ packageDetail }) => {
  if (!packageDetail) return <div>Select a package to see details</div>;

  return (
    <div>
      <h2>{packageDetail.name} - {packageDetail.version}</h2>
      <p>{packageDetail.description}</p>
      <h3>Dependencies</h3>
      <ul>
        {packageDetail.dependencies && packageDetail.dependencies.length > 0 ? (
          packageDetail.dependencies.map((dep, index) => <li key={index}>{dep}</li>)
        ) : (
          <li>No dependencies</li>
        )}
      </ul>
      <h3>Ratings</h3>
      <ul>
        <li>Overall: {packageDetail.ratings.overall}</li>
        <li>Quality: {packageDetail.ratings.quality}</li>
        <li>Performance: {packageDetail.ratings.performance}</li>
      </ul>
    </div>
  );
};

export default PackageDetails;
