import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({
    message: err.expose ? err.message : "Une erreur est survenue",
  });
};
