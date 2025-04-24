import * as d3 from "d3";
import * as ss from "simple-statistics"
import {linearRegression, linearRegressionLine} from "simple-statistics";
//Logarithmic regression equation derived: y a + blnx
// y= 2.8348 + 0.4204ln(x) r value = 0.9729
export function calculateLogarithmicRegression(biomassData) {
    const xValues = getAccurateXValues(biomassData);
    const yValues = biomassData.map((d) => d.Biomass_g_L);
    const n = xValues.length;
    const sum_xlogy = xValues.reduce((sum, x, i) => sum + Math.log(x) * yValues[i], 0);
    const sum_logx = xValues.reduce((sum, x) => sum + Math.log(x), 0);
    const sum_y = yValues.reduce((sum, y) => sum + y, 0);
    const sum_logx_sq = xValues.reduce((sum, x) => sum + Math.pow(Math.log(x), 2), 0);
    const b = (n * sum_xlogy - sum_logx * sum_y) / (n * sum_logx_sq - Math.pow(sum_logx, 2));
    const a = (sum_y - b * sum_logx) / n;

    return { a, b };
}
export function getAccurateXValues(biomassData){
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const passedXValues = biomassData.map(d => {
        const currentDate = new Date(d.collection_date);
        return (currentDate - startDate) / (1000 * 60 * 60 * 24);
    });
    return passedXValues.map(d => d + 1);
}

export function calculateLinearRegression(biomassData) {
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const xValues = biomassData.map(d => ((new Date(d.collection_date) - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const yValues = biomassData.map(d => d.Biomass_g_L);

    const inputs = xValues.map((x, i) => [x, yValues[i]]);
    const regression = ss.linearRegression(xValues.map((x, i) => [x, yValues[i]]));
    const regressionLine = linearRegressionLine(regression);
    const predicted = xValues.map(x => regressionLine(x));
    const rSquared = ss.rSquared(inputs, regressionLine);

    return {
        slope: regression.m,
        intercept: regression.b,
        rSquared: rSquared
    };
}
export const returnMultivariateRegression = () => {
    const modelSlope = 0.037711;
    const modelIntercept = 3.806281;
    const RMSE = 0.054629
    return {
        slope: modelSlope,
        intercept: modelIntercept,
        RMSE: RMSE
    };
}

export function getSlope(point1, point2) {
    return (point2.y - point1.y) / (point2.x - point1.x);
}



