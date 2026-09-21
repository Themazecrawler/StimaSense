import AutoPredictionService from '../../../services/ml/AutoPredictionService';

describe('AutoPredictionService', () => {
  it('does not start or fabricate predictions without an operational model', async () => {
    const service = new AutoPredictionService();

    await expect(service.startAutoPredictions()).rejects.toThrow(
      'No operational outage prediction model is installed',
    );
    await expect(service.forceUpdate()).rejects.toThrow(
      'No operational outage prediction model is installed',
    );

    expect(service.getCurrentPrediction()).toBeNull();
    expect(service.getPredictionHistory()).toEqual([]);
    expect(service.getPredictionTrends()).toBeNull();
    expect(service.getStatus()).toMatchObject({
      isRunning: false,
      totalPredictions: 0,
      reason: 'operational_model_unavailable',
    });
  });

  it('never invokes subscribers when there is no live prediction', () => {
    const service = new AutoPredictionService();
    const subscriber = jest.fn();
    const unsubscribe = service.subscribe(subscriber);
    expect(subscriber).not.toHaveBeenCalled();
    expect(unsubscribe).not.toThrow();
  });
});
