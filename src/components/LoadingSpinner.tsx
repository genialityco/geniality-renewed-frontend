const LoadingSpinner = ({ message }) => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>{!!message ? message : 'Loading'}...</p>
  </div>
);

export default LoadingSpinner;
