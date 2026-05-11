//
//  HealthKitPlugin.swift
//  App
//
//  Created by Enas El Mershati on 11/05/2026.
//
import Capacitor
import HealthKit

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitPlugin"
    public let jsName = "HealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHeartRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCalories", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }

        let types: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]

        healthStore.requestAuthorization(toShare: nil, read: types) { success, error in
            if success {
                call.resolve(["authorized": true])
            } else {
                call.reject(error?.localizedDescription ?? "Authorization failed")
            }
        }
    }

    @objc func getSteps(_ call: CAPPluginCall) {
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now)

        let query = HKStatisticsQuery(quantityType: stepType,
                                      quantitySamplePredicate: predicate,
                                      options: .cumulativeSum) { _, result, error in
            guard let result = result, let sum = result.sumQuantity() else {
                call.resolve(["value": 0])
                return
            }
            let steps = sum.doubleValue(for: .count())
            call.resolve(["value": Int(steps)])
        }
        healthStore.execute(query)
    }

    @objc func getHeartRate(_ call: CAPPluginCall) {
        let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        let query = HKSampleQuery(sampleType: hrType,
                                   predicate: predicate,
                                   limit: 1,
                                   sortDescriptors: [sortDescriptor]) { _, samples, error in
            guard let sample = samples?.first as? HKQuantitySample else {
                call.resolve(["value": 0])
                return
            }
            let bpm = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
            call.resolve(["value": Int(bpm)])
        }
        healthStore.execute(query)
    }

    @objc func getCalories(_ call: CAPPluginCall) {
        let calType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now)

        let query = HKStatisticsQuery(quantityType: calType,
                                      quantitySamplePredicate: predicate,
                                      options: .cumulativeSum) { _, result, error in
            guard let result = result, let sum = result.sumQuantity() else {
                call.resolve(["value": 0])
                return
            }
            let cal = sum.doubleValue(for: .kilocalorie())
            call.resolve(["value": Int(cal)])
        }
        healthStore.execute(query)
    }
}
