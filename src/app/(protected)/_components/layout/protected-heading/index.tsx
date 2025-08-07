interface ProtectedHeadingProps {
  title: string;
  description: string;
}

const ProtectedHeading = ({
  title,
  description,
}: ProtectedHeadingProps): JSX.Element => {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export { ProtectedHeading };
