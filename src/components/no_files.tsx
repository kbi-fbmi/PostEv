const NoFiles = () => {
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
      <div className="text-center">
        <p className="text-3xl">There are no photos loaded yet</p>
        <p className="text-xl">Drag and drop photos here</p>
        <p>Or click and select them in the OS native UI</p>
      </div>
    </div>
  );
};

export default NoFiles;
