import "./quiz.css";

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>{!!message ? message : "Loading"}...</p>
  </div>
);

export default LoadingSpinner;
