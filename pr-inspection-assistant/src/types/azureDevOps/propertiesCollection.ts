// this doesn't match ADO PropertiesCollection exactly.  Their docs(https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-request-properties/list?view=azure-devops-rest-7.0&tabs=HTTP#propertiescollection) appear to be wrong.
export interface PropertiesCollection {
    count: number;
    value: Record<string, PropertyValue>;
}

export interface PropertyValue {
    $type: string;
    $value: string;
};